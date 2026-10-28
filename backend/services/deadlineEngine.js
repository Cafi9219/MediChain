import { ledger } from '../blockchain/blockchain.js';
import { Transaction } from '../blockchain/transaction.js';
import { sha256 } from '../blockchain/cryptoUtils.js';
import { signDigestWithSystemKey } from '../security/keystore.js';

export const THETA_THRESHOLD = 0.30; // Critical escalation threshold (theta = 0.3)

export const ORGAN_PRESERVATION_WINDOWS = {
  'Heart': 4,
  'Eye / Cornea': 48,
  'Liver': 8,
  'Left Kidney': 24,
  'Right Kidney': 24,
  'Lung': 6,
  'Pancreas': 12,
  'Small Bowel / Intestine': 8,
  'Cadaver Inspection': 6
};

// Injectable clock function (defaults to real Date.now)
let currentClock = () => Date.now();

export function getClockTime() {
  return currentClock();
}

export function setClock(clockFn) {
  currentClock = clockFn;
}

export function resetClock() {
  currentClock = () => Date.now();
}

// In-memory escalation deduplication state: Set of `${recordId}:${windowKey}:${txType}`
const escalationDedupeSet = new Set();

/**
 * Restore deduplication state from persistent blockchain ledger transactions on startup.
 * Ensures duplicate prevention survives server restarts.
 */
export function initializeDedupeFromLedger() {
  escalationDedupeSet.clear();
  for (const block of ledger.chain) {
    for (const tx of block.transactions) {
      if ((tx.type === 'ESCALATION' || tx.type === 'LATE_EVENT') && tx.payload) {
        const { recordId, windowKey } = tx.payload;
        const txType = tx.type;
        if (recordId && windowKey && txType) {
          escalationDedupeSet.add(`${recordId}:${windowKey}:${txType}`);
        }
      }
    }
  }
}

// Auto-initialize dedupe state from ledger on load
initializeDedupeFromLedger();

/**
 * Format milliseconds to hours and minutes string
 */
function formatRemainingTime(ms) {
  if (ms <= 0) return '0m (Overdue)';
  const totalMinutes = Math.floor(ms / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

/**
 * Classifies risk level strictly according to paper specification:
 * - rho >= 0.5: GREEN
 * - theta <= rho < 0.5: AMBER (approaching critical threshold)
 * - 0 < rho < theta (theta = 0.30): RED (critical window, escalation required)
 * - rho <= 0: RED / OVERDUE (deadline breached)
 */
export function classifyRisk(remainingMs, totalWindowMs, theta = THETA_THRESHOLD) {
  if (totalWindowMs <= 0) {
    return { riskLevel: 'RED', overdue: true, fractionRemaining: 0 };
  }
  const overdue = remainingMs <= 0;
  const fractionRemaining = remainingMs / totalWindowMs;

  let riskLevel = 'GREEN';
  if (overdue) {
    riskLevel = 'RED';
  } else if (fractionRemaining < theta) {
    riskLevel = 'RED'; // Enters RED prior to expiration when below theta
  } else if (fractionRemaining < 0.50) {
    riskLevel = 'AMBER';
  }

  return {
    riskLevel,
    overdue,
    fractionRemaining: Number(Math.max(0, fractionRemaining).toFixed(4))
  };
}

/**
 * Calculate active physiological deadlines across donor dossiers and harvested organs.
 * Matches the exact schema expected by the frontend.
 */
export function calculateDeadlines(cadaverRegistry = [], harvestReports = []) {
  const now = currentClock();
  const deadlineItems = [];

  // 1. Cadaver Inspection Windows
  for (const cad of cadaverRegistry) {
    if (cad.status === 'PENDING_INSPECTION_SIGNATURES') {
      const windowHours = ORGAN_PRESERVATION_WINDOWS['Cadaver Inspection'] || 6;
      let startMs = cad.createdAt ? new Date(cad.createdAt).getTime() : now;
      if (cad.arrivalDate && cad.arrivalTime) {
        const parsedArrival = new Date(`${cad.arrivalDate}T${cad.arrivalTime}:00`);
        if (!isNaN(parsedArrival.getTime())) startMs = parsedArrival.getTime();
      }

      const totalWindowMs = windowHours * 3600 * 1000;
      const deadlineAtMs = startMs + totalWindowMs;
      const remainingMs = deadlineAtMs - now;
      const { riskLevel, overdue, fractionRemaining } = classifyRisk(remainingMs, totalWindowMs);

      deadlineItems.push({
        recordId: cad.hexId,
        label: `Cadaver Intake [${cad.hexId}]`,
        kind: 'cadaver',
        organName: null,
        windowKey: 'Cadaver Inspection',
        windowHours,
        startTime: new Date(startMs).toISOString(),
        deadlineAt: new Date(deadlineAtMs).toISOString(),
        remainingMs,
        remainingSeconds: Math.floor(remainingMs / 1000),
        remainingFormatted: formatRemainingTime(remainingMs),
        fractionRemaining,
        riskLevel,
        overdue,
        event: 'Forensic Intake Window',
        status: cad.status
      });
    }
  }

  // 2. Organ Cold Ischemia Windows
  for (const rep of harvestReports) {
    if (Array.isArray(rep.organs)) {
      for (const org of rep.organs) {
        const organName = org.organName || 'Organ';
        const windowHours = ORGAN_PRESERVATION_WINDOWS[organName] || 12;

        let startMs = rep.createdAt ? new Date(rep.createdAt).getTime() : now;
        if (org.extractionDate && org.extractionTime) {
          const parsed = new Date(`${org.extractionDate}T${org.extractionTime}:00`);
          if (!isNaN(parsed.getTime())) startMs = parsed.getTime();
        }

        const totalWindowMs = windowHours * 3600 * 1000;
        const deadlineAtMs = startMs + totalWindowMs;
        const remainingMs = deadlineAtMs - now;
        const { riskLevel, overdue, fractionRemaining } = classifyRisk(remainingMs, totalWindowMs);

        deadlineItems.push({
          recordId: org.organId,
          label: `${organName} [${org.organId}]`,
          kind: 'organ',
          organName,
          windowKey: organName,
          windowHours,
          startTime: new Date(startMs).toISOString(),
          deadlineAt: new Date(deadlineAtMs).toISOString(),
          remainingMs,
          remainingSeconds: Math.floor(remainingMs / 1000),
          remainingFormatted: formatRemainingTime(remainingMs),
          fractionRemaining,
          riskLevel,
          overdue,
          event: 'Cold Ischemia Window',
          status: rep.status
        });
      }
    }
  }

  // Sort: Red/Overdue first, then ascending remaining time
  deadlineItems.sort((a, b) => a.remainingMs - b.remainingMs);
  return deadlineItems;
}

/**
 * Scan active deadlines and automatically record on-chain ESCALATION or LATE_EVENT
 * audit transactions with ECDSA P-256 signatures from CTORB system key.
 *
 * Rules:
 * - Entering RED (fraction < theta, not overdue): Appends signed ESCALATION transaction.
 * - Overdue (remainingMs <= 0): Appends signed LATE_EVENT transaction.
 * - Deduplication: Exactly one ESCALATION and/or one LATE_EVENT per record+windowKey.
 * - Advisory only: Never modifies clinical record status, never lowers 2-of-3 threshold.
 */
export function scanAndEscalate(cadaverRegistry = [], harvestReports = []) {
  const deadlines = calculateDeadlines(cadaverRegistry, harvestReports);
  const triggeredEvents = [];

  for (const item of deadlines) {
    // Check if record has entered RED or is OVERDUE
    if (item.riskLevel === 'RED' || item.overdue) {
      // Determine transaction type per research paper specification:
      // - Overdue: LATE_EVENT
      // - Enters RED (< theta, approaching critical deadline): ESCALATION
      const txType = item.overdue ? 'LATE_EVENT' : 'ESCALATION';
      const condition = item.overdue ? 'OVERDUE_ISCHEMIA_BREACH' : 'CRITICAL_WINDOW_APPROACHING';
      const dedupeKey = `${item.recordId}:${item.windowKey}:${txType}`;

      if (!escalationDedupeSet.has(dedupeKey)) {
        escalationDedupeSet.add(dedupeKey);

        const payload = {
          recordId: item.recordId,
          label: item.label,
          kind: item.kind,
          windowKey: item.windowKey,
          riskLevel: item.riskLevel,
          overdue: item.overdue,
          remainingMs: item.remainingMs,
          fractionRemaining: item.fractionRemaining,
          condition,
          escalatedTo: 'CTORB_COORDINATOR',
          deadlineAt: item.deadlineAt,
          timestamp: new Date(currentClock()).toISOString()
        };

        const payloadHash = sha256(payload);

        // Sign escalation transaction using CTORB system key (P-256 ECDSA)
        let systemSignature;
        try {
          const sigRes = signDigestWithSystemKey(payloadHash);
          systemSignature = {
            signerId: 'CTORB-SYS-001',
            role: 'CTORB_SYSTEM_COORDINATOR',
            signature: sigRes.signature,
            publicKey: sigRes.publicKey,
            algorithm: 'ECDSA_P256_SHA256',
            timestamp: payload.timestamp
          };
        } catch (err) {
          systemSignature = {
            signerId: 'CTORB-SYS-001',
            error: err.message
          };
        }

        const escalationTx = new Transaction({
          type: txType,
          payload,
          senderDepartment: 'CTORB_ADMIN',
          submittedBy: 'CTORB_SYSTEM_DAEMON',
          signatures: [systemSignature]
        });

        ledger.addTransaction(escalationTx);
        ledger.minePendingTransactions('CTORB_MONITOR_NODE');

        triggeredEvents.push({
          txId: escalationTx.id,
          type: txType,
          recordId: item.recordId,
          condition,
          signature: systemSignature.signature
        });
      }
    }
  }

  return { deadlines, triggeredEvents };
}
