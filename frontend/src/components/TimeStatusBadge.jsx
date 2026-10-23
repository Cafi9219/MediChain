import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { fetchDeadlines } from '../utils/api.js';

/**
 * Maximum preservation / verification windows in hours for client-side fallback
 * when backend /api/deadlines fields are not present on the record.
 */
const WINDOW_CONFIG_HOURS = {
  Heart: { maxHours: 6, amberHours: 2, redHours: 1 },
  Lung: { maxHours: 6, amberHours: 2, redHours: 1 },
  Pancreas: { maxHours: 8, amberHours: 3, redHours: 1 },
  'Small Bowel / Intestine': { maxHours: 8, amberHours: 3, redHours: 1 },
  Liver: { maxHours: 12, amberHours: 4, redHours: 1.5 },
  'Left Kidney': { maxHours: 30, amberHours: 8, redHours: 3 },
  'Right Kidney': { maxHours: 30, amberHours: 8, redHours: 3 },
  Kidney: { maxHours: 30, amberHours: 8, redHours: 3 },
  'Eye / Cornea': { maxHours: 336, amberHours: 48, redHours: 12 },
  CADAVER_SLA: { maxHours: 6, amberHours: 2, redHours: 0.5 }
};

// Shared cache for /api/deadlines so multiple badges do not spam the server
let cachedDeadlinesMap = null;
let lastDeadlinesFetchAt = 0;
let pendingDeadlinesPromise = null;

async function getBackendDeadlineForRecord(recordId) {
  if (!recordId) return null;
  const now = Date.now();
  if (cachedDeadlinesMap && now - lastDeadlinesFetchAt < 15000) {
    return cachedDeadlinesMap[recordId] || null;
  }
  if (!pendingDeadlinesPromise) {
    pendingDeadlinesPromise = fetchDeadlines()
      .then(res => {
        lastDeadlinesFetchAt = Date.now();
        const map = {};
        if (res && res.success) {
          const items = Array.isArray(res.deadlines)
            ? res.deadlines
            : Array.isArray(res.items)
            ? res.items
            : res.deadlines && typeof res.deadlines === 'object'
            ? Object.values(res.deadlines)
            : [];
          for (const item of items) {
            const key = item.organId || item.hexId || item.reportId || item.recordId || item.id;
            if (key) map[key] = item;
          }
          if (res.deadlines && !Array.isArray(res.deadlines) && typeof res.deadlines === 'object') {
            Object.assign(map, res.deadlines);
          }
        }
        cachedDeadlinesMap = map;
        return map;
      })
      .finally(() => {
        pendingDeadlinesPromise = null;
      });
  }
  const map = await pendingDeadlinesPromise;
  return map ? map[recordId] || null : null;
}

function parseRecordStartTimestamp(record, type) {
  if (!record) return Date.now();

  if (type === 'organ') {
    if (record.extractionDate && record.extractionTime) {
      const parsed = Date.parse(`${record.extractionDate}T${record.extractionTime}:00`);
      if (!Number.isNaN(parsed)) return parsed;
    }
  }

  if (record.arrivalDate && record.arrivalTime) {
    const parsed = Date.parse(`${record.arrivalDate}T${record.arrivalTime}:00`);
    if (!Number.isNaN(parsed)) return parsed;
  }

  if (record.deathDate && record.deathTime) {
    const parsed = Date.parse(`${record.deathDate}T${record.deathTime}:00`);
    if (!Number.isNaN(parsed)) return parsed;
  }

  if (record.createdAt) {
    const parsed = Date.parse(record.createdAt);
    if (!Number.isNaN(parsed)) return parsed;
  }

  return Date.now();
}

function formatDuration(ms) {
  const absMs = Math.abs(ms);
  const totalMinutes = Math.floor(absMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h left`;
  }
  const hStr = String(hours).padStart(2, '0');
  const mStr = String(minutes).padStart(2, '0');
  return ms < 0 ? `Overdue by ${hStr}h ${mStr}m` : `${hStr}h ${mStr}m left`;
}

export function evaluateDeadlineStatus(record, type = 'cadaver', deadlineOverride = null) {
  const src = deadlineOverride || record?.deadline || record || {};

  // 1. Prefer backend /api/deadlines fields when present
  const backendRisk = (
    src.riskLevel ||
    src.urgencyStatus ||
    src.deadlineStatus ||
    src.classification ||
    ''
  ).toUpperCase();
  let remainingMs = null;

  if (typeof src.remainingMs === 'number') {
    remainingMs = src.remainingMs;
  } else if (typeof src.remainingSeconds === 'number') {
    remainingMs = src.remainingSeconds * 1000;
  } else if (src.deadlineAt || src.expiresAt) {
    const target = Date.parse(src.deadlineAt || src.expiresAt);
    if (!Number.isNaN(target)) {
      remainingMs = target - Date.now();
    }
  }

  if (backendRisk === 'GREEN' || backendRisk === 'AMBER' || backendRisk === 'RED') {
    const ms = remainingMs !== null ? remainingMs : 3600000;
    return {
      level: backendRisk,
      remainingMs: ms,
      label: formatDuration(ms),
      windowTitle: type === 'organ' ? 'Viability Window (Server)' : 'Verification Window (Server)',
      source: 'backend'
    };
  }

  // 2. Client-side calculation fallback
  const organKey = type === 'organ' ? record?.organName || 'Kidney' : 'CADAVER_SLA';
  const cfg = WINDOW_CONFIG_HOURS[organKey] || WINDOW_CONFIG_HOURS.Kidney;
  const startMs = parseRecordStartTimestamp(record, type);
  const maxMs = cfg.maxHours * 3600000;
  const computedRemainingMs =
    remainingMs !== null ? remainingMs : startMs + maxMs - Date.now();

  const remainingHours = computedRemainingMs / 3600000;
  let level = 'GREEN';
  if (remainingHours <= cfg.redHours) {
    level = 'RED';
  } else if (remainingHours <= cfg.amberHours) {
    level = 'AMBER';
  }

  return {
    level,
    remainingMs: computedRemainingMs,
    label: formatDuration(computedRemainingMs),
    windowTitle: type === 'organ' ? `${cfg.maxHours}h Viability Window` : `${cfg.maxHours}h SLA Window`,
    source: 'client-fallback'
  };
}

/**
 * Display-only Green/Amber/Red countdown badge.
 * Uses backend /api/deadlines fields when present and falls back to client-side calculation.
 * Never blocks or skips any signature or action.
 */
export default function TimeStatusBadge({
  record,
  type = 'cadaver',
  deadlineOverride = null,
  compact = false
}) {
  const [, setTick] = useState(0);
  const [serverDeadline, setServerDeadline] = useState(null);

  const recordKey = record?.organId || record?.hexId || record?.reportId || record?.id;

  useEffect(() => {
    let active = true;
    if (recordKey && !deadlineOverride && !record?.deadline) {
      getBackendDeadlineForRecord(recordKey).then(found => {
        if (active && found) setServerDeadline(found);
      });
    }
    const timer = setInterval(() => setTick(t => t + 1), 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [recordKey, deadlineOverride, record]);

  const info = evaluateDeadlineStatus(record, type, deadlineOverride || serverDeadline);

  const styles = {
    GREEN: 'bg-emerald-50 text-emerald-900 border-emerald-300',
    AMBER: 'bg-amber-50 text-amber-900 border-amber-300',
    RED: 'bg-rose-50 text-rose-900 border-rose-300'
  };

  const statusNames = {
    GREEN: 'Safe Window',
    AMBER: 'Expiring Soon',
    RED: info.remainingMs < 0 ? 'Window Elapsed' : 'Critical Window'
  };

  const Icon =
    info.level === 'GREEN'
      ? CheckCircle2
      : info.level === 'AMBER'
      ? Clock
      : AlertTriangle;

  return (
    <span
      role="status"
      aria-label={`${statusNames[info.level]}: ${info.label} (${info.windowTitle})`}
      title={`${statusNames[info.level]} • ${info.windowTitle} (Display-only timer)`}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${
        styles[info.level]
      }`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span className="font-mono">{info.label}</span>
      {!compact && (
        <span className="hidden sm:inline text-xs font-medium opacity-90">
          • {statusNames[info.level]}
        </span>
      )}
    </span>
  );
}
