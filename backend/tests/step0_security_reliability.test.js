import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  verifyDoctorPinSecure,
  sanitizeSpecialist,
  resetAttemptsForTest
} from '../security/authSecurity.js';
import {
  generateCaptcha,
  validateCaptchaServerSide
} from '../security/captchaSecurity.js';
import {
  atomicWriteJson,
  loadJsonSafe,
  initCadaverPersistence,
  saveCadavers,
  initOrganPersistence,
  saveOrgans
} from '../data/persistence.js';
import {
  calculateDeadlines,
  scanAndEscalate,
  setClock,
  resetClock,
  initializeDedupeFromLedger
} from '../services/deadlineEngine.js';
import { ledger } from '../blockchain/blockchain.js';
import { CONSORTIUM_CREDENTIALS } from '../data/doctors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('========================================================================');
console.log(' STEP 0: SECURITY & RELIABILITY VERIFICATION TEST SUITE');
console.log('========================================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${testName}`);
  } else {
    console.error(`  [FAIL] ${testName}`);
    throw new Error(`Test assertion failed: ${testName}`);
  }
}

// -----------------------------------------------------------------------------
// 1. PIN & Secret Leakage Prevention
// -----------------------------------------------------------------------------
console.log('--- 1. Testing Zero PIN/Secret Leakage in Specialist Directory ---');

for (const person of CONSORTIUM_CREDENTIALS.personnel) {
  const sanitized = sanitizeSpecialist(person);
  assert(sanitized.pin === undefined, `No plaintext PIN on sanitized specialist ${person.id}`);
  assert(sanitized.password === undefined, `No password field on sanitized specialist ${person.id}`);
  assert(sanitized.hash === undefined, `No hash field on sanitized specialist ${person.id}`);
  assert(sanitized.salt === undefined, `No salt field on sanitized specialist ${person.id}`);
  assert(typeof sanitized.name === 'string' && typeof sanitized.role === 'string', `Public profile intact for ${person.id}`);
}

// -----------------------------------------------------------------------------
// 2. Constant-Time scrypt Verification & Role Authorization
// -----------------------------------------------------------------------------
console.log('\n--- 2. Testing Secure Constant-Time scrypt PIN Verification ---');

// Valid verification
const validAuth = verifyDoctorPinSecure('CIFV-DOC-101', '1010', 'CIFV');
assert(validAuth.success === true, 'Valid specialist credentials succeed');
assert(validAuth.doctor.id === 'CIFV-DOC-101', 'Returns sanitized specialist profile');
assert(validAuth.doctor.pin === undefined, 'Sanitized profile contains no PIN');

// Incorrect PIN
const invalidAuth = verifyDoctorPinSecure('CIFV-DOC-101', 'WRONG_PIN', 'CIFV');
assert(invalidAuth.success === false, 'Invalid PIN is rejected');
assert(invalidAuth.status === 401, 'Returns HTTP 401');
assert(invalidAuth.error.includes('Authentication failed'), 'Generic error message returned');

// Department mismatch
const deptMismatch = verifyDoctorPinSecure('CIFV-DOC-101', '1010', 'SROPS');
assert(deptMismatch.success === false && deptMismatch.status === 403, 'Cross-department impersonation rejected with HTTP 403');

// Nonexistent specialist (uniform timing / no username enumeration)
const nonexistentAuth = verifyDoctorPinSecure('FAKE-DOC-999', '1010');
assert(nonexistentAuth.success === false && nonexistentAuth.status === 401, 'Nonexistent doctor ID fails closed with identical 401');
assert(nonexistentAuth.error === invalidAuth.error, 'Error message does not reveal whether specialist exists');

// -----------------------------------------------------------------------------
// 3. Brute-Force PIN Attempt Limiting & Lockout
// -----------------------------------------------------------------------------
console.log('\n--- 3. Testing Brute-Force PIN Attempt Limiting & Lockout ---');

resetAttemptsForTest('CIFV-DOC-102');

// Trigger 5 consecutive failed attempts
for (let i = 1; i <= 4; i++) {
  const attempt = verifyDoctorPinSecure('CIFV-DOC-102', '000' + i, 'CIFV');
  assert(attempt.success === false && attempt.status === 401, `Failed attempt ${i} rejected with 401`);
}

// 5th attempt triggers lockout
const lockoutAttempt = verifyDoctorPinSecure('CIFV-DOC-102', '0005', 'CIFV');
assert(lockoutAttempt.success === false && lockoutAttempt.status === 429, '5th failed attempt triggers HTTP 429 Security Lockout');

// 6th attempt (even with correct PIN '1020') must remain locked out
const blockedCorrectPin = verifyDoctorPinSecure('CIFV-DOC-102', '1020', 'CIFV');
assert(blockedCorrectPin.success === false && blockedCorrectPin.status === 429, 'Account remains locked out even with correct PIN');

resetAttemptsForTest('CIFV-DOC-102');
const afterReset = verifyDoctorPinSecure('CIFV-DOC-102', '1020', 'CIFV');
assert(afterReset.success === true, 'Verification succeeds after lockout reset');

// -----------------------------------------------------------------------------
// 4. Server-Side Captcha Validation (Fail-Closed, Single-Use, Expiring)
// -----------------------------------------------------------------------------
console.log('\n--- 4. Testing Captcha Security & Fail-Closed Behavior ---');

// Fail-closed on missing fields
const missingBoth = validateCaptchaServerSide(null, null);
assert(missingBoth.valid === false, 'Rejects null captcha tokens');

const missingInput = validateCaptchaServerSide('CAP_SOME_ID', '');
assert(missingInput.valid === false, 'Rejects missing captcha input string');

// Valid flow
const c1 = generateCaptcha();
assert(typeof c1.id === 'string' && typeof c1.text === 'string', 'Generated captcha challenge');

const validCheck = validateCaptchaServerSide(c1.id, c1.text);
assert(validCheck.valid === true, 'Server-side captcha verification succeeds with valid token');

// Single-use token: second use must fail
const replayCheck = validateCaptchaServerSide(c1.id, c1.text);
assert(replayCheck.valid === false, 'Replay of already-consumed captcha token is rejected (single-use)');

// Incorrect guess must consume token to prevent brute-forcing
const c2 = generateCaptcha();
const wrongGuess = validateCaptchaServerSide(c2.id, 'INCORRECT');
assert(wrongGuess.valid === false, 'Incorrect captcha code rejected');
const retrySame = validateCaptchaServerSide(c2.id, c2.text);
assert(retrySame.valid === false, 'Token was consumed on failed attempt, preventing brute force');

// -----------------------------------------------------------------------------
// 5. Persistence & Blockchain Integrity Across Controlled Restart
// -----------------------------------------------------------------------------
console.log('\n--- 5. Testing Persistence & Restart Recovery ---');

const testCadaver = {
  hexId: '0xTEST_CAD_01',
  patientName: 'Test Donor Recovery',
  status: 'PENDING_INSPECTION_SIGNATURES',
  createdAt: new Date().toISOString()
};

// Initial load
let liveCadavers = initCadaverPersistence([]);
liveCadavers.unshift(testCadaver);
saveCadavers(liveCadavers);

// Simulate restart: reload from disk
const reloadedCadavers = initCadaverPersistence([]);
const foundTest = reloadedCadavers.find(c => c.hexId === '0xTEST_CAD_01');
assert(foundTest !== undefined, 'Newly registered cadaver record persisted and reloaded across restart');

// Clean up test entry from persistence
liveCadavers = liveCadavers.filter(c => c.hexId !== '0xTEST_CAD_01');
saveCadavers(liveCadavers);

// Verify ledger chain validity is intact
const chainVal = ledger.isChainValid();
assert(chainVal.valid === true, 'Ledger hash-chain integrity is valid across persistence checks');

// -----------------------------------------------------------------------------
// 6. /api/deadlines Endpoint Schema & Risk Classification
// -----------------------------------------------------------------------------
console.log('\n--- 6. Testing Deadline Schema & Risk Classification ---');

const sampleCadavers = [
  {
    hexId: '0xCAD_GREEN',
    patientName: 'Green Donor',
    status: 'PENDING_INSPECTION_SIGNATURES',
    createdAt: new Date(Date.now() - 3600 * 1000).toISOString() // 1h elapsed of 6h -> GREEN
  },
  {
    hexId: '0xCAD_RED',
    patientName: 'Red Donor',
    status: 'PENDING_INSPECTION_SIGNATURES',
    createdAt: new Date(Date.now() - 3600 * 1000 * 7).toISOString() // 7h elapsed of 6h -> RED / Overdue
  }
];

const sampleReports = [
  {
    reportId: 'REP_AMBER',
    status: 'PENDING_SURGICAL_SIGNATURES',
    createdAt: new Date(Date.now() - 3600 * 1000 * 3).toISOString(),
    organs: [
      {
        organId: '7A92-01-HEART',
        organName: 'Heart', // 4h window, 3h elapsed -> 1h remaining (25%) -> AMBER
        extractionDate: new Date(Date.now() - 3600 * 1000 * 3).toISOString().split('T')[0],
        extractionTime: new Date(Date.now() - 3600 * 1000 * 3).toTimeString().substring(0, 5)
      }
    ]
  }
];

const deadlines = calculateDeadlines(sampleCadavers, sampleReports);
assert(deadlines.length === 3, 'Calculated deadlines for 2 cadavers and 1 organ');

// Verify exact frontend schema fields
const requiredKeys = [
  'recordId', 'label', 'kind', 'windowKey', 'windowHours', 'startTime',
  'deadlineAt', 'remainingMs', 'remainingSeconds', 'remainingFormatted',
  'fractionRemaining', 'riskLevel', 'overdue', 'event', 'status'
];

for (const dl of deadlines) {
  for (const k of requiredKeys) {
    assert(dl[k] !== undefined, `Deadline item ${dl.recordId} has property '${k}'`);
  }
}

const greenItem = deadlines.find(d => d.recordId === '0xCAD_GREEN');
assert(greenItem.riskLevel === 'GREEN' && !greenItem.overdue, 'Normal timeline classified as GREEN');

const redItem = deadlines.find(d => d.recordId === '0xCAD_RED');
assert(redItem.riskLevel === 'RED' && redItem.overdue === true, 'Breached timeline classified as RED/Overdue');

// -----------------------------------------------------------------------------
// 7. Overdue Event Ledger Escalation & Duplicate Prevention
// -----------------------------------------------------------------------------
console.log('\n--- 7. Testing Escalation Ledger Transactions & Duplicate Prevention ---');

// Back up ledger state and raw file before test escalation
const ledgerFilePath = path.join(__dirname, '..', 'data', 'ledger.json');
const rawLedgerBackup = fs.readFileSync(ledgerFilePath, 'utf8');
const initialChainBackup = [...ledger.chain];
const initialPendingBackup = [...ledger.pendingTransactions];

// Inject simulated clock ahead by 10 hours
const baseTime = Date.now();
setClock(() => baseTime + 10 * 3600 * 1000);

const testCadHexId = '0xCAD_OVERDUE_' + Date.now();
const overdueTestCad = [
  {
    hexId: testCadHexId,
    patientName: 'Overdue Patient',
    status: 'PENDING_INSPECTION_SIGNATURES',
    createdAt: new Date(baseTime).toISOString()
  }
];

// First scan: should trigger 1 escalation transaction
const initialBlockHeight = ledger.chain.length;
const scan1 = scanAndEscalate(overdueTestCad, []);
assert(scan1.triggeredEvents.length === 1, 'First scan triggers 1 LATE_EVENT on-chain escalation');
assert(ledger.chain.length === initialBlockHeight + 1, 'Escalation block was mined onto the ledger');

// Check transaction payload in the new block
const latestBlock = ledger.getLatestBlock();
const escTx = latestBlock.transactions.find(t => t.type === 'LATE_EVENT' || t.type === 'ESCALATION');
assert(escTx !== undefined, 'Mined block contains the LATE_EVENT transaction');
assert(escTx.payload.escalatedTo === 'CTORB_COORDINATOR', 'Target is CTORB_COORDINATOR');
assert(escTx.payload.recordId === testCadHexId, 'Transaction references overdue record ID');

// Verify workflow state was NOT modified
assert(overdueTestCad[0].status === 'PENDING_INSPECTION_SIGNATURES', 'Workflow status remained PENDING (audit-only)');

// Second scan: duplicate prevention must prevent logging again
const scan2 = scanAndEscalate(overdueTestCad, []);
assert(scan2.triggeredEvents.length === 0, 'Second scan generates 0 duplicate escalation transactions');

// Simulate server restart: restore dedupe state from ledger
initializeDedupeFromLedger();
const scanAfterRestart = scanAndEscalate(overdueTestCad, []);
assert(scanAfterRestart.triggeredEvents.length === 0, 'Deduplication survives restart: 0 duplicate escalations emitted');

// Restore real clock and clean up test blocks from persistent ledger
resetClock();
ledger.chain = initialChainBackup;
ledger.pendingTransactions = initialPendingBackup;
fs.writeFileSync(ledgerFilePath, rawLedgerBackup, 'utf8');
initializeDedupeFromLedger();

console.log('\n========================================================================');
console.log(` ALL STEP 0 TESTS PASSED: ${passedTests}/${totalTests} tests successful.`);
console.log('========================================================================\n');

process.exit(0);
