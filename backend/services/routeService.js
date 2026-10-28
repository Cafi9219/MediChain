/**
 * Route-Based ETA Service with OSRM and Calibrated Haversine Fallback
 *
 * Implements:
 * - Corridor Graph routing between designated national transplant centers
 * - OSRM road distance and transit duration queries with configurable endpoint & timeout
 * - Geodetic Haversine fallback: eta_fb = kappa * g / v_avg
 * - Viability check: mu = D(o) - (t_now + eta + t_proc), flagging infeasible if mu < 0
 * - Blockchain transaction anchoring with 'ETA_RECORDED' and integrity hash
 */

import { sha256 } from '../blockchain/cryptoUtils.js';
import { ledger } from '../blockchain/blockchain.js';
import { Transaction } from '../blockchain/transaction.js';
import { getHarvestReports } from '../routes/organRoutes.js';
import { ORGAN_PRESERVATION_WINDOWS, getClockTime } from './deadlineEngine.js';

// The 7 Designated Regional Corridor Hubs
export const CORRIDOR_HOSPITALS = {
  'AIIMS New Delhi': { lat: 28.5672, lng: 77.2100 },
  'Safdarjung': { lat: 28.5700, lng: 77.2078 },
  'Safdarjung Hospital (New Delhi)': { lat: 28.5700, lng: 77.2078 },
  'Sir Ganga Ram': { lat: 28.6386, lng: 77.1896 },
  'Sir Ganga Ram Hospital (New Delhi)': { lat: 28.6386, lng: 77.1896 },
  'Apollo Chennai': { lat: 13.0604, lng: 80.2508 },
  'Apollo Hospital (Chennai)': { lat: 13.0604, lng: 80.2508 },
  'FMRI Gurugram': { lat: 28.4595, lng: 77.0725 },
  'Fortis Memorial Research Institute (Gurugram)': { lat: 28.4595, lng: 77.0725 },
  'Manipal Bengaluru': { lat: 12.9584, lng: 77.6487 },
  'Manipal Hospital (Bengaluru)': { lat: 12.9584, lng: 77.6487 },
  'PGIMER Chandigarh': { lat: 30.7634, lng: 76.7770 },
  'PGIMER (Chandigarh)': { lat: 30.7634, lng: 76.7770 }
};

/**
 * Normalizes hospital input to resolve aliases
 */
export function resolveHospitalCoordinates(hospitalName) {
  if (!hospitalName) return null;
  const direct = CORRIDOR_HOSPITALS[hospitalName];
  if (direct) return direct;

  const normalized = hospitalName.trim().toLowerCase();
  for (const [key, coords] of Object.entries(CORRIDOR_HOSPITALS)) {
    if (key.toLowerCase() === normalized || key.toLowerCase().includes(normalized) || normalized.includes(key.toLowerCase())) {
      return coords;
    }
  }
  return null;
}

/**
 * Geodetic Haversine Great-Circle Distance (g) in kilometers
 */
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371.0088; // Earth mean radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calibrated Haversine Fallback Route Calculation:
 * eta_fb = (kappa * g) / v_avg
 */
export function calculateHaversineFallback(originCoord, destCoord, options = {}) {
  const kappa = options.kappa || Number(process.env.KAPPA_TORTUOSITY) || 1.30; // Road tortuosity factor
  const v_avg = options.v_avg || Number(process.env.V_AVG_KMH) || 45.0; // Average green corridor speed (km/h)

  const g = calculateHaversineDistance(originCoord.lat, originCoord.lng, destCoord.lat, destCoord.lng);
  const roadDistKm = Math.max(0.5, kappa * g);
  const etaSeconds = Math.round((roadDistKm / v_avg) * 3600);

  return {
    distanceKm: Number(roadDistKm.toFixed(2)),
    etaSeconds,
    method: 'haversine-fallback',
    straightDistanceKm: Number(g.toFixed(2))
  };
}

/**
 * Queries OSRM road-network routing service with timeout
 */
export async function queryOsrmRoute(originCoord, destCoord, timeoutMs = 3000) {
  const osrmBase = process.env.OSRM_URL || 'https://router.project-osrm.org';
  const url = `${osrmBase}/route/v1/driving/${originCoord.lng},${originCoord.lat};${destCoord.lng},${destCoord.lat}?overview=false`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) {
      throw new Error(`OSRM HTTP ${res.status}`);
    }
    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      throw new Error(`OSRM returned code: ${data.code}`);
    }
    const route = data.routes[0];
    return {
      distanceKm: Number((route.distance / 1000).toFixed(2)),
      etaSeconds: Math.round(route.duration),
      method: 'osrm'
    };
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

/**
 * Calculates Route ETA, evaluates viability margin mu, and anchors transaction
 *
 * @param {Object} params
 * @param {string} params.origin - Origin hospital name
 * @param {string} params.destination - Destination hospital name
 * @param {string} [params.organId] - Organ identifier
 * @param {string} [params.organType] - Organ type (Heart, Liver, Kidney, etc.)
 * @param {number} [params.deadlineAt] - Epoch timestamp (sec or ms) of organ preservation deadline
 * @param {number} [params.tProcSeconds] - Processing buffer time (seconds)
 * @param {boolean} [params.forceFallback=false] - Explicitly trigger fallback for benchmarking
 */
export async function calculateRouteAndViability({
  origin,
  destination,
  organId = 'ORG_TRANSIT',
  organType = 'Heart',
  deadlineAt = null,
  tProcSeconds = 1800,
  forceFallback = false
}) {
  const originCoord = resolveHospitalCoordinates(origin);
  const destCoord = resolveHospitalCoordinates(destination);

  if (!originCoord) {
    throw new Error(`Origin hospital '${origin}' not found in corridor graph`);
  }
  if (!destCoord) {
    throw new Error(`Destination hospital '${destination}' not found in corridor graph`);
  }

  // 1. Determine Route ETA (OSRM or Haversine fallback)
  let routeResult;
  if (!forceFallback) {
    try {
      routeResult = await queryOsrmRoute(originCoord, destCoord);
    } catch (err) {
      // Graceful fallback to calibrated Haversine
      routeResult = calculateHaversineFallback(originCoord, destCoord);
    }
  } else {
    routeResult = calculateHaversineFallback(originCoord, destCoord);
  }

  const nowSeconds = Math.floor(getClockTime() / 1000);
  const arrivalAt = new Date((nowSeconds + routeResult.etaSeconds) * 1000).toISOString();

  // 2. Viability Check:
  // mu = D(o) - (t_now + eta + t_proc)
  let deadlineSeconds = null;

  if (deadlineAt) {
    // If milliseconds provided, convert to seconds
    deadlineSeconds = deadlineAt > 1e11 ? Math.floor(deadlineAt / 1000) : Math.floor(deadlineAt);
  } else {
    // Look up organ in registry or default to organ window from current time
    let windowHours = ORGAN_PRESERVATION_WINDOWS[organType] || 6;
    let harvestTimeSec = nowSeconds;

    try {
      const reports = getHarvestReports();
      for (const rep of reports) {
        if (rep.organs) {
          const match = rep.organs.find(o => o.organId === organId);
          if (match) {
            windowHours = ORGAN_PRESERVATION_WINDOWS[match.organName] || windowHours;
            if (match.extractionDate && match.extractionTime) {
              const parsed = new Date(`${match.extractionDate}T${match.extractionTime}:00`);
              if (!isNaN(parsed.getTime())) {
                harvestTimeSec = Math.floor(parsed.getTime() / 1000);
              }
            }
            break;
          }
        }
      }
    } catch {
      // Defaults to current time
    }

    deadlineSeconds = harvestTimeSec + windowHours * 3600;
  }

  const totalRequiredTime = nowSeconds + routeResult.etaSeconds + tProcSeconds;
  const mu = deadlineSeconds - totalRequiredTime;
  const infeasible = mu < 0;
  const viable = !infeasible;

  // 3. Anchor ETA_RECORDED Transaction to Ledger
  const payload = {
    organId,
    origin,
    destination,
    estimatedDurationSeconds: routeResult.etaSeconds,
    distanceKm: routeResult.distanceKm,
    provider: routeResult.method === 'osrm' ? 'OSRM' : 'FALLBACK',
    arrivalAt,
    deadlineSeconds,
    tProcSeconds,
    mu,
    infeasible,
    integrityHash: sha256({
      organId,
      origin,
      destination,
      etaSeconds: routeResult.etaSeconds,
      distanceKm: routeResult.distanceKm,
      provider: routeResult.method === 'osrm' ? 'OSRM' : 'FALLBACK'
    })
  };

  const etaTx = new Transaction({
    type: 'ETA_RECORDED',
    payload,
    senderDepartment: 'SROPS',
    submittedBy: 'ROUTE_SERVICE'
  });

  ledger.addTransaction(etaTx);

  return {
    success: true,
    organId,
    origin,
    destination,
    etaSeconds: routeResult.etaSeconds,
    distanceKm: routeResult.distanceKm,
    method: routeResult.method,
    arrivalAt,
    mu,
    infeasible,
    viable,
    txId: etaTx.id
  };
}
