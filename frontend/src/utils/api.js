const BASE_URL = '/api';

export async function fetchCaptcha() {
  const res = await fetch(`${BASE_URL}/auth/captcha`);
  return res.json();
}

export async function loginDepartment(departmentId, password, captchaId, captchaInput) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ departmentId, password, captchaId, captchaInput })
  });
  return res.json();
}

export async function fetchDoctors(department = '') {
  const url = department ? `${BASE_URL}/auth/doctors?department=${department}` : `${BASE_URL}/auth/doctors`;
  const res = await fetch(url);
  return res.json();
}

export async function verifyDoctor(doctorId, pin, captchaId = '', captchaInput = '') {
  const res = await fetch(`${BASE_URL}/auth/verify-doctor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ doctorId, pin, captchaId, captchaInput })
  });
  return res.json();
}

// Cadaver endpoints (CIFV)
export async function submitCadaver(data) {
  const res = await fetch(`${BASE_URL}/cadavers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function fetchCadavers(status = '') {
  const url = status ? `${BASE_URL}/cadavers?status=${status}` : `${BASE_URL}/cadavers`;
  const res = await fetch(url);
  return res.json();
}

export async function signCadaver(hexId, doctorId, pin) {
  const res = await fetch(`${BASE_URL}/cadavers/${hexId}/sign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ doctorId, pin })
  });
  return res.json();
}

// Organ endpoints (SROPS)
export async function submitOrganHarvest(data) {
  const res = await fetch(`${BASE_URL}/organs/harvest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function fetchHarvestReports() {
  const res = await fetch(`${BASE_URL}/organs/reports`);
  return res.json();
}

export async function fetchOrgansList() {
  const res = await fetch(`${BASE_URL}/organs/list`);
  return res.json();
}

export async function signOrganHarvest(reportId, doctorId, pin) {
  const res = await fetch(`${BASE_URL}/organs/reports/${reportId}/sign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ doctorId, pin })
  });
  return res.json();
}

// Blockchain endpoints
export async function fetchBlockchain(role = 'ADMIN') {
  const res = await fetch(`${BASE_URL}/blockchain`, {
    headers: { 'x-department-role': role }
  });
  return res.json();
}

export async function verifyBlockchainIntegrity() {
  const res = await fetch(`${BASE_URL}/blockchain/verify`);
  return res.json();
}

export async function simulateTamper() {
  const res = await fetch(`${BASE_URL}/blockchain/simulate-tamper`, { method: 'POST' });
  return res.json();
}

// Admin endpoints
export async function fetchAdminOverview() {
  const res = await fetch(`${BASE_URL}/admin/overview`);
  return res.json();
}

// Deadlines endpoints
export async function fetchDeadlines() {
  try {
    const res = await fetch(`${BASE_URL}/deadlines`);
    if (!res.ok) return { success: false, deadlines: [] };
    const data = await res.json();
    return {
      success: Boolean(data && data.success !== false),
      deadlines: Array.isArray(data?.deadlines) ? data.deadlines : []
    };
  } catch {
    return { success: false, deadlines: [] };
  }
}

export async function triggerDeadlineScan() {
  try {
    const res = await fetch(`${BASE_URL}/deadlines/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Graceful offline fallback
  }
  return { success: false, error: 'Deadline scan endpoint unavailable' };
}

// Hospital & Transit ETA endpoints
const FALLBACK_HOSPITALS = {
  'AIIMS New Delhi': { lat: 28.5672, lng: 77.2100 },
  'Safdarjung Hospital (New Delhi)': { lat: 28.5700, lng: 77.2078 },
  'Sir Ganga Ram Hospital (New Delhi)': { lat: 28.6386, lng: 77.1896 },
  'Apollo Hospital (Chennai)': { lat: 13.0604, lng: 80.2508 },
  'Fortis Memorial Research Institute (Gurugram)': { lat: 28.4595, lng: 77.0725 },
  'Manipal Hospital (Bengaluru)': { lat: 12.9584, lng: 77.6487 },
  'PGIMER (Chandigarh)': { lat: 30.7634, lng: 76.7770 }
};

export async function fetchHospitals() {
  try {
    const res = await fetch(`${BASE_URL}/eta/hospitals`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.hospitals && Object.keys(data.hospitals).length > 0) {
        return data;
      }
    }
  } catch {
    // Offline / fallback mode
  }
  return { success: true, hospitals: FALLBACK_HOSPITALS };
}

function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function postEta(payload) {
  try {
    const res = await fetch(`${BASE_URL}/eta`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      return await res.json();
    }
    const errData = await res.json().catch(() => null);
    if (errData && errData.error) {
      return { success: false, error: errData.error };
    }
  } catch {
    // Offline / fallback calculation
  }

  // Graceful client-side fallback if backend is offline or route unavailable
  const originCoord = FALLBACK_HOSPITALS[payload.origin] || { lat: 28.5672, lng: 77.2100 };
  const destCoord = FALLBACK_HOSPITALS[payload.destination] || { lat: 28.6386, lng: 77.1896 };
  const straightDist = calculateHaversineDistance(originCoord.lat, originCoord.lng, destCoord.lat, destCoord.lng);
  const roadDist = Math.max(1.2, straightDist * 1.3); // typical road tortuosity factor
  const avgSpeedKmh = 45; // average green corridor speed
  const etaSeconds = Math.round((roadDist / avgSpeedKmh) * 3600);
  const arrivalAt = new Date(Date.now() + etaSeconds * 1000).toISOString();

  return {
    success: true,
    etaSeconds,
    distanceKm: Number(roadDist.toFixed(1)),
    method: 'haversine-fallback',
    arrivalAt,
    txId: 'OFFLINE_FALLBACK'
  };
}
