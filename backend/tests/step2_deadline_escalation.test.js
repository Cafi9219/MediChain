/**
 * Unit Test Suite for Step 2: Deadline Engine Fix & Signed Escalations
 *
 * Tests:
 * 1. Risk classification: GREEN, AMBER, RED (< theta = 0.30), and OVERDUE (rho <= 0)
 * 2. Entering RED triggers a signed ESCALATION transaction (not LATE_EVENT)
 * 3. Overdue breach triggers a signed LATE_EVENT transaction
 * 4. Verification that escalation transactions carry valid ECDSA P-256 system signatures
 * 5. Deduplication: exactly 1 ESCALATION and 1 LATE_EVENT per record
 * 6. Advisory property: A RED/escalated record strictly requires k = 2 valid specialist signatures
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  calculateDeadlines,
  scanAndEscalate,
  classifyRisk,
  setClock,
  resetClock,
  initializeDedupeFromLedger,
  THETA_THRESHOLD
} from '../services/deadlineEngine.js';
import { ledger } from '../blockchain/blockchain.js';
import { verifyDigestWithPublicKey, getRegisteredPublicKey } from '../security/keystore.js';
import { sha256 } from '../blockchain/cryptoUtils.js';
import { processThresholdApproval } from '../security/thresholdApproval.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LEDGER_PATH = path.join(__dirname, '..', 'data', 'ledger.json');

let passed = 0;
let failed = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  [PASS] ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${desc}: ${err.message}`);
    failed++;
  }
}

console.log('\n========================================================================');
console.log(' STEP 2: DEADLINE ENGINE & SIGNED ESCALATIONS TEST SUITE');
console.log('========================================================================\n');

// Backup ledger state for test isolation
const originalLedgerDisk = fs.existsSync(LEDGER_PATH) ? fs.readFileSync(LEDGER_PATH, 'utf-8') : null;
const originalChain = JSON.parse(JSON.stringify(ledger.chain));
const originalPending = JSON.parse(JSON.stringify(ledger.pendingTransactions));

function restoreLedger() {
  ledger.chain = JSON.parse(JSON.stringify(originalChain));
  ledger.pendingTransactions = JSON.parse(JSON.stringify(originalPending));
  if (originalLedgerDisk) {
    fs.writeFileSync(LEDGER_PATH, originalLedgerDisk, 'utf-8');
  }
  initializeDedupeFromLedger();
  resetClock();
}

// --------------------------------------------------------------------------
// 1. Risk Classification & Boundary Tests
// --------------------------------------------------------------------------
console.log('--- 1. Testing Risk Classification & Boundary Transitions ---');

it('Nominal window (rho >= 0.5) is classified as GREEN', () => {
  const res = classifyRisk(3600 * 1000 * 4, 3600 * 1000 * 6); // 4/6 = 0.6667
  assert.strictEqual(res.riskLevel, 'GREEN');
  assert.strictEqual(res.overdue, false);
});

it('Warning window (theta <= rho < 0.5) is classified as AMBER', () => {
  const res = classifyRisk(3600 * 1000 * 2, 3600 * 1000 * 6); // 2/6 = 0.3333
  assert.strictEqual(res.riskLevel, 'AMBER');
  assert.strictEqual(res.overdue, false);
});

it('Critical window entering RED prior to expiration (0 < rho < theta=0.30)', () => {
  const res = classifyRisk(3600 * 1000 * 1, 3600 * 1000 * 6); // 1/6 = 0.1667 < 0.30
  assert.strictEqual(res.riskLevel, 'RED');
  assert.strictEqual(res.overdue, false, 'Must not be marked overdue while remainingMs > 0');
});

it('Expired window (rho <= 0) is classified as RED and OVERDUE', () => {
  const res = classifyRisk(-5000, 3600 * 1000 * 6);
  assert.strictEqual(res.riskLevel, 'RED');
  assert.strictEqual(res.overdue, true);
});

// --------------------------------------------------------------------------
// 2. Entering RED Triggers Signed ESCALATION Transaction
// --------------------------------------------------------------------------
console.log('\n--- 2. Testing Signed ESCALATION Transaction on Entering RED ---');

const baseTime = 1770000000000;
setClock(() => baseTime);

const cadavers = [
  {
    hexId: '0xCAD_ESCALATE_TEST',
    patientName: 'Test Donor',
    status: 'PENDING_INSPECTION_SIGNATURES',
    createdAt: new Date(baseTime - 3600 * 1000 * 4.5).toISOString() // 4.5h elapsed out of 6h window -> 1.5h remaining (25% < 30%)
  }
];

it('Record entering RED triggers an ESCALATION transaction (not LATE_EVENT)', () => {
  const scanResult = scanAndEscalate(cadavers, []);
  assert.strictEqual(scanResult.triggeredEvents.length, 1);
  const ev = scanResult.triggeredEvents[0];
  assert.strictEqual(ev.type, 'ESCALATION');
  assert.strictEqual(ev.recordId, '0xCAD_ESCALATE_TEST');
  assert.strictEqual(ev.condition, 'CRITICAL_WINDOW_APPROACHING');

  // Verify the mined transaction
  const latestBlock = ledger.getLatestBlock();
  const tx = latestBlock.transactions.find(t => t.id === ev.txId);
  assert.ok(tx);
  assert.strictEqual(tx.type, 'ESCALATION');
  assert.strictEqual(tx.payload.riskLevel, 'RED');
  assert.strictEqual(tx.payload.overdue, false);
  assert.strictEqual(tx.senderDepartment, 'CTORB_ADMIN');
});

it('ESCALATION transaction carries a valid ECDSA P-256 signature from CTORB system key', () => {
  const latestBlock = ledger.getLatestBlock();
  const tx = latestBlock.transactions.find(t => t.payload.recordId === '0xCAD_ESCALATE_TEST');
  assert.ok(tx.signatures && tx.signatures.length === 1);
  const sigObj = tx.signatures[0];

  assert.strictEqual(sigObj.signerId, 'CTORB-SYS-001');
  assert.strictEqual(sigObj.algorithm, 'ECDSA_P256_SHA256');

  // Cryptographically verify signature against registered system public key
  const sysPubKey = getRegisteredPublicKey('CTORB-SYS-001');
  assert.ok(sysPubKey);
  const payloadHash = sha256(tx.payload);
  const isValid = verifyDigestWithPublicKey(sysPubKey, payloadHash, sigObj.signature);
  assert.strictEqual(isValid, true, 'System signature on ESCALATION transaction must be cryptographically valid');
});

// --------------------------------------------------------------------------
// 3. Overdue Breach Triggers Signed LATE_EVENT Transaction
// --------------------------------------------------------------------------
console.log('\n--- 3. Testing Signed LATE_EVENT Transaction on Overdue Breach ---');

it('Overdue breach triggers signed LATE_EVENT transaction', () => {
  // Advance clock past the 6h window
  setClock(() => baseTime + 3600 * 1000 * 2); // 6.5h elapsed > 6h window -> overdue

  const scanResult = scanAndEscalate(cadavers, []);
  assert.strictEqual(scanResult.triggeredEvents.length, 1);
  const ev = scanResult.triggeredEvents[0];
  assert.strictEqual(ev.type, 'LATE_EVENT');
  assert.strictEqual(ev.condition, 'OVERDUE_ISCHEMIA_BREACH');

  const latestBlock = ledger.getLatestBlock();
  const tx = latestBlock.transactions.find(t => t.id === ev.txId);
  assert.ok(tx);
  assert.strictEqual(tx.type, 'LATE_EVENT');
  assert.strictEqual(tx.payload.overdue, true);

  // Verify signature
  const sysPubKey = getRegisteredPublicKey('CTORB-SYS-001');
  const payloadHash = sha256(tx.payload);
  const isValid = verifyDigestWithPublicKey(sysPubKey, payloadHash, tx.signatures[0].signature);
  assert.strictEqual(isValid, true, 'System signature on LATE_EVENT transaction must be valid');
});

// --------------------------------------------------------------------------
// 4. Deduplication
// --------------------------------------------------------------------------
console.log('\n--- 4. Testing Deduplication Persistence ---');

it('Duplicate scan generates 0 additional escalation transactions', () => {
  const scanResult = scanAndEscalate(cadavers, []);
  assert.strictEqual(scanResult.triggeredEvents.length, 0, 'No duplicate escalation transactions should be created');
});

// --------------------------------------------------------------------------
// 5. Advisory Invariant: RED/Overdue Record Still Needs 2 Valid Signatures
// --------------------------------------------------------------------------
console.log('\n--- 5. Testing Advisory Invariant: Threshold Cannot Be Lowered ---');

it('A RED or overdue record still strictly requires k=2 valid specialist signatures', () => {
  const redRecord = {
    hexId: '0xCAD_RED_APPROVAL_TEST',
    patientName: 'Red Status Donor',
    causeOfDeath: 'Cardiac Arrest',
    deathDate: '2026-10-28',
    bloodGroup: 'B+',
    createdAt: new Date(baseTime - 3600 * 1000 * 5).toISOString(),
    status: 'PENDING_INSPECTION_SIGNATURES',
    signatures: []
  };

  const payload = {
    hexId: redRecord.hexId,
    patientName: redRecord.patientName,
    causeOfDeath: redRecord.causeOfDeath,
    deathDate: redRecord.deathDate,
    bloodGroup: redRecord.bloodGroup,
    createdAt: redRecord.createdAt
  };

  // Ensure record is in RED
  const deadlines = calculateDeadlines([redRecord], []);
  assert.strictEqual(deadlines[0].riskLevel, 'RED');

  // Trigger on-chain escalation for this record
  scanAndEscalate([redRecord], []);

  // Attempt 1: First specialist signs (k - 1 = 1)
  const res1 = processThresholdApproval({
    record: redRecord,
    recordId: redRecord.hexId,
    doctorId: 'CIFV-DOC-101',
    pin: '1010',
    dept: 'CIFV',
    milestoneType: 'CADAVER_VERIFIED_BLOCK',
    payloadToSign: payload,
    getLatestPayloadToCommit: () => payload,
    targetVerifiedStatus: 'VERIFIED_FOR_EXTRACTION',
    k: 2
  });

  assert.strictEqual(res1.success, true);
  assert.strictEqual(res1.signaturesCount, 1);
  assert.strictEqual(res1.isFullyVerified, false, 'RED record must NOT be verified with only 1 signature');
  assert.strictEqual(redRecord.status, 'PENDING_INSPECTION_SIGNATURES', 'Status must stay PENDING with k-1 signatures');

  // Attempt 2: Second specialist signs (k = 2)
  const res2 = processThresholdApproval({
    record: redRecord,
    recordId: redRecord.hexId,
    doctorId: 'CIFV-DOC-102',
    pin: '1020',
    dept: 'CIFV',
    milestoneType: 'CADAVER_VERIFIED_BLOCK',
    payloadToSign: payload,
    getLatestPayloadToCommit: () => payload,
    targetVerifiedStatus: 'VERIFIED_FOR_EXTRACTION',
    k: 2
  });

  assert.strictEqual(res2.success, true);
  assert.strictEqual(res2.signaturesCount, 2);
  assert.strictEqual(res2.isFullyVerified, true);
  assert.strictEqual(redRecord.status, 'VERIFIED_FOR_EXTRACTION');
  assert.ok(res2.blockMined);
});

// Restore ledger and clock
restoreLedger();

console.log('\n========================================================================');
console.log(` STEP 2 TESTS COMPLETE: ${passed} passed, ${failed} failed.`);
console.log('========================================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
