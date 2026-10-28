/**
 * Unit Test Suite for Step 1: ECDSA 2-of-3 Threshold Approval
 *
 * Tests:
 * 1. Specialist key generation & keystore AES-256-GCM protection
 * 2. Canonical approval digest computation m_d = SHA256(type || SHA256(payload) || dept || nonce_d)
 * 3. Threshold requirement: k - 1 signatures leaves milestone PENDING
 * 4. Threshold requirement: k = 2 distinct valid signatures commits milestone to blockchain
 * 5. Rejection: Duplicate signer from same specialist
 * 6. Rejection: Cross-department specialist authorization check
 * 7. Rejection: Signature forged using legacy HMAC shared secret
 * 8. Rejection: Payload altered after signing (commit-time tamper detection)
 * 9. Rejection: Signature / nonce reused in a new session (replay protection)
 * 10. Tamper detection: Block edited after commit breaks Merkle root and hash chain
 */

import assert from 'assert';
import crypto from 'crypto';
import { CONSORTIUM_CREDENTIALS } from '../data/doctors.js';
import {
  initKeystore,
  signDigestWithDoctorPin,
  verifyDigestWithPublicKey,
  getRegisteredPublicKey
} from '../security/keystore.js';
import {
  computePayloadHash,
  computeApprovalDigest,
  processThresholdApproval,
  rotateApprovalSession
} from '../security/thresholdApproval.js';
import { generateDoctorSignatureHmac } from '../blockchain/legacyHmac.js';
import { ledger } from '../blockchain/blockchain.js';
import { sha256 } from '../blockchain/cryptoUtils.js';

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
console.log(' STEP 1: ECDSA 2-OF-3 THRESHOLD APPROVAL TEST SUITE');
console.log('========================================================================\n');

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LEDGER_PATH = path.join(__dirname, '..', 'data', 'ledger.json');

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
}

// --------------------------------------------------------------------------
// 1. Keystore & Key Generation
// --------------------------------------------------------------------------
console.log('--- 1. Testing Specialist ECDSA Key Generation & Keystore Protection ---');

it('All 9 specialists have real ECDSA P-256 public keys in doctors.js', () => {
  const doctors = CONSORTIUM_CREDENTIALS.personnel;
  assert.strictEqual(doctors.length, 9);
  doctors.forEach(doc => {
    assert.ok(doc.publicKey.startsWith('0x3059'), `Doctor ${doc.id} public key is not DER SPKI hex`);
    assert.strictEqual(doc.publicKey.length, 184, `Doctor ${doc.id} public key is not 91 bytes hex`);
  });
});

it('Keystore encrypts private keys with AES-256-GCM using scrypt from PIN', () => {
  const keystore = initKeystore();
  assert.ok(keystore['CIFV-DOC-101']);
  const entry = keystore['CIFV-DOC-101'];
  assert.ok(entry.salt);
  assert.ok(entry.iv);
  assert.ok(entry.authTag);
  assert.ok(entry.ciphertext);
  assert.ok(entry.ciphertext.length >= 200, 'Encrypted PKCS#8 DER private key length');
});

it('Valid PIN signs digest and produces verifiable ECDSA signature', () => {
  const testDigest = sha256('TEST_PAYLOAD_DIGEST');
  const res = signDigestWithDoctorPin('CIFV-DOC-101', '1010', testDigest);
  assert.ok(res.signature.startsWith('0x30'), 'Signature is DER ASN.1 sequence');
  assert.strictEqual(res.algorithm, 'ECDSA_P256_SHA256');

  const pubKey = getRegisteredPublicKey('CIFV-DOC-101');
  const valid = verifyDigestWithPublicKey(pubKey, testDigest, res.signature);
  assert.strictEqual(valid, true, 'Signature must verify against registered public key');
});

it('Invalid PIN fails decryption and throws error', () => {
  const testDigest = sha256('TEST_PAYLOAD_DIGEST');
  assert.throws(
    () => signDigestWithDoctorPin('CIFV-DOC-101', '9999', testDigest),
    /Keystore decryption failed/
  );
});

// --------------------------------------------------------------------------
// 2. Digest Specification m_d = SHA256(type || SHA256(payload) || dept || nonce_d)
// --------------------------------------------------------------------------
console.log('\n--- 2. Testing Approval Digest Computation ---');

it('Approval digest matches exact mathematical specification', () => {
  const type = 'CADAVER_VERIFIED_BLOCK';
  const payload = { hexId: '0xTEST123', name: 'John Doe' };
  const dept = 'CIFV';
  const nonce = 'a1b2c3d4e5f6';

  const payloadHash = computePayloadHash(payload);
  const digest = computeApprovalDigest(type, payloadHash, dept, nonce);

  // Manual independent computation
  const expected = sha256(`${type}${payloadHash}${dept}${nonce}`);
  assert.strictEqual(digest, expected);
});

// --------------------------------------------------------------------------
// 3. Threshold Approval Workflow (k - 1 stays pending, k = 2 commits)
// --------------------------------------------------------------------------
console.log('\n--- 3. Testing Threshold Consensus (k - 1 stays pending, k = 2 commits) ---');

const testRecord = {
  hexId: '0xTEST_CADAVER_001',
  patientName: 'Donor Alpha',
  causeOfDeath: 'Head Trauma',
  deathDate: '2026-10-28',
  bloodGroup: 'O+',
  createdAt: new Date().toISOString(),
  status: 'PENDING_INSPECTION_SIGNATURES',
  signatures: []
};

const payload = {
  hexId: testRecord.hexId,
  patientName: testRecord.patientName,
  causeOfDeath: testRecord.causeOfDeath,
  deathDate: testRecord.deathDate,
  bloodGroup: testRecord.bloodGroup,
  createdAt: testRecord.createdAt
};

it('First signature (k - 1 = 1) keeps milestone PENDING without mining block', () => {
  const res = processThresholdApproval({
    record: testRecord,
    recordId: testRecord.hexId,
    doctorId: 'CIFV-DOC-101',
    pin: '1010',
    dept: 'CIFV',
    milestoneType: 'CADAVER_VERIFIED_BLOCK',
    payloadToSign: payload,
    getLatestPayloadToCommit: () => payload,
    targetVerifiedStatus: 'VERIFIED_FOR_EXTRACTION',
    validatorNode: 'CIFV_CONSORTIUM_NODE',
    k: 2
  });

  assert.strictEqual(res.success, true);
  assert.strictEqual(res.signaturesCount, 1);
  assert.strictEqual(res.isFullyVerified, false);
  assert.strictEqual(res.blockMined, null);
  assert.strictEqual(testRecord.status, 'PENDING_INSPECTION_SIGNATURES');
});

it('Second signature (k = 2) satisfies threshold, transitions status and mines block', () => {
  const initialChainLength = ledger.chain.length;

  const res = processThresholdApproval({
    record: testRecord,
    recordId: testRecord.hexId,
    doctorId: 'CIFV-DOC-102',
    pin: '1020',
    dept: 'CIFV',
    milestoneType: 'CADAVER_VERIFIED_BLOCK',
    payloadToSign: payload,
    getLatestPayloadToCommit: () => payload,
    targetVerifiedStatus: 'VERIFIED_FOR_EXTRACTION',
    validatorNode: 'CIFV_CONSORTIUM_NODE',
    k: 2
  });

  assert.strictEqual(res.success, true);
  assert.strictEqual(res.signaturesCount, 2);
  assert.strictEqual(res.isFullyVerified, true);
  assert.ok(res.blockMined);
  assert.strictEqual(testRecord.status, 'VERIFIED_FOR_EXTRACTION');
  assert.strictEqual(ledger.chain.length, initialChainLength + 1);
});

// --------------------------------------------------------------------------
// 4. Duplicate Signer & Department Authorization Rejections
// --------------------------------------------------------------------------
console.log('\n--- 4. Testing Sybil / Duplicate & Department Violations ---');

it('Reject same specialist signing twice (duplicate rejection)', () => {
  const record = {
    hexId: '0xTEST_DUPE',
    status: 'PENDING_INSPECTION_SIGNATURES',
    signatures: []
  };

  // First signature
  const res1 = processThresholdApproval({
    record,
    recordId: record.hexId,
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

  // Duplicate signature attempt
  const res2 = processThresholdApproval({
    record,
    recordId: record.hexId,
    doctorId: 'CIFV-DOC-101',
    pin: '1010',
    dept: 'CIFV',
    milestoneType: 'CADAVER_VERIFIED_BLOCK',
    payloadToSign: payload,
    getLatestPayloadToCommit: () => payload,
    targetVerifiedStatus: 'VERIFIED_FOR_EXTRACTION',
    k: 2
  });

  assert.strictEqual(res2.success, false);
  assert.strictEqual(res2.status, 400);
  assert.match(res2.error, /Duplicate signature rejected/);
  assert.strictEqual(record.signatures.length, 1);
});

it('Reject specialist from another department (department authorization check)', () => {
  const record = {
    hexId: '0xTEST_CROSS_DEPT',
    status: 'PENDING_INSPECTION_SIGNATURES',
    signatures: []
  };

  // SROPS surgeon attempting to sign CIFV intake
  const res = processThresholdApproval({
    record,
    recordId: record.hexId,
    doctorId: 'SROPS-SUR-201',
    pin: '2010',
    dept: 'CIFV',
    milestoneType: 'CADAVER_VERIFIED_BLOCK',
    payloadToSign: payload,
    getLatestPayloadToCommit: () => payload,
    targetVerifiedStatus: 'VERIFIED_FOR_EXTRACTION',
    k: 2
  });

  assert.strictEqual(res.success, false);
  assert.strictEqual(res.status, 403);
  assert.match(res.error, /Signer unauthorized: Specialist 'Dr. Sunil Kulkarni' belongs to department 'SROPS'/);
});

// --------------------------------------------------------------------------
// 5. Forgery with Old Legacy HMAC Secret
// --------------------------------------------------------------------------
console.log('\n--- 5. Testing Forgery with Legacy HMAC Secret ---');

it('Reject signature forged with legacy shared HMAC secret', () => {
  const record = {
    hexId: '0xTEST_HMAC_FORGE',
    status: 'PENDING_INSPECTION_SIGNATURES',
    signatures: []
  };

  const hmacSig = generateDoctorSignatureHmac('CIFV-DOC-101', 'Dr. Rajesh Sharma', sha256(payload));

  const res = processThresholdApproval({
    record,
    recordId: record.hexId,
    doctorId: 'CIFV-DOC-101',
    providedSignature: hmacSig.signatureHash,
    dept: 'CIFV',
    milestoneType: 'CADAVER_VERIFIED_BLOCK',
    payloadToSign: payload,
    getLatestPayloadToCommit: () => payload,
    targetVerifiedStatus: 'VERIFIED_FOR_EXTRACTION',
    k: 2
  });

  assert.strictEqual(res.success, false);
  assert.strictEqual(res.status, 400);
  assert.match(res.error, /Invalid ECDSA P-256 signature/);
});

it('Reject signature forged with rogue uncertified ECDSA key pair', () => {
  const record = {
    hexId: '0xTEST_ROGUE_KEY',
    status: 'PENDING_INSPECTION_SIGNATURES',
    signatures: []
  };

  // Attacker generates their own rogue P-256 key pair
  const rogueKp = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const sign = crypto.createSign('SHA256');
  sign.update(Buffer.from(sha256('TEST_ROGUE_DIGEST'), 'hex'));
  const rogueSig = '0x' + sign.sign(rogueKp.privateKey, 'hex');

  // Attempts to present this signature on behalf of Dr. Rajesh Sharma
  const res = processThresholdApproval({
    record,
    recordId: record.hexId,
    doctorId: 'CIFV-DOC-101',
    providedSignature: rogueSig,
    dept: 'CIFV',
    milestoneType: 'CADAVER_VERIFIED_BLOCK',
    payloadToSign: payload,
    getLatestPayloadToCommit: () => payload,
    targetVerifiedStatus: 'VERIFIED_FOR_EXTRACTION',
    k: 2
  });

  assert.strictEqual(res.success, false);
  assert.strictEqual(res.status, 400);
  assert.match(res.error, /Cryptographic signature verification failed: Invalid ECDSA P-256 signature/);
});

// --------------------------------------------------------------------------
// 6. Post-Signature Tampering at Commit Time
// --------------------------------------------------------------------------
console.log('\n--- 6. Testing Commit-Time Tamper Detection ---');

it('Reject commit if payload was altered after signing', () => {
  const mutablePayload = { ...payload };
  const record = {
    hexId: '0xTEST_TAMPER_COMMIT',
    status: 'PENDING_INSPECTION_SIGNATURES',
    signatures: []
  };

  // Signer 1 signs initial payload
  processThresholdApproval({
    record,
    recordId: record.hexId,
    doctorId: 'CIFV-DOC-101',
    pin: '1010',
    dept: 'CIFV',
    milestoneType: 'CADAVER_VERIFIED_BLOCK',
    payloadToSign: mutablePayload,
    getLatestPayloadToCommit: () => mutablePayload,
    targetVerifiedStatus: 'VERIFIED_FOR_EXTRACTION',
    k: 2
  });

  // Adversary tampers with the payload before Signer 2 commits
  const tamperedPayload = { ...mutablePayload, causeOfDeath: 'Tampered - Poisoning' };

  // Signer 2 attempts to finalize threshold commit on tampered payload
  const res2 = processThresholdApproval({
    record,
    recordId: record.hexId,
    doctorId: 'CIFV-DOC-102',
    pin: '1020',
    dept: 'CIFV',
    milestoneType: 'CADAVER_VERIFIED_BLOCK',
    payloadToSign: mutablePayload,
    getLatestPayloadToCommit: () => tamperedPayload,
    targetVerifiedStatus: 'VERIFIED_FOR_EXTRACTION',
    k: 2
  });

  assert.strictEqual(res2.success, false);
  assert.strictEqual(res2.status, 409);
  assert.match(res2.error, /Post-signature tampering detected at commit time/);
  assert.strictEqual(record.status, 'PENDING_INSPECTION_SIGNATURES');
});

// --------------------------------------------------------------------------
// 7. Signature / Nonce Replay Across Sessions
// --------------------------------------------------------------------------
console.log('\n--- 7. Testing Session Replay Protection ---');

it('Reject signature reused in a new session (nonce replay attack)', () => {
  const record1 = {
    hexId: '0xTEST_REPLAY_1',
    status: 'PENDING_INSPECTION_SIGNATURES',
    signatures: []
  };

  // Run session 1
  const session1 = rotateApprovalSession(record1.hexId, 'CADAVER_VERIFIED_BLOCK', 'CIFV', computePayloadHash(payload));
  const nonce1 = session1.nonce;
  const digest1 = computeApprovalDigest('CADAVER_VERIFIED_BLOCK', computePayloadHash(payload), 'CIFV', nonce1);
  const sig1 = signDigestWithDoctorPin('CIFV-DOC-101', '1010', digest1).signature;

  // Signer 1 successfully participates in session 1
  const res1 = processThresholdApproval({
    record: record1,
    recordId: record1.hexId,
    doctorId: 'CIFV-DOC-101',
    providedSignature: sig1,
    providedNonce: nonce1,
    dept: 'CIFV',
    milestoneType: 'CADAVER_VERIFIED_BLOCK',
    payloadToSign: payload,
    getLatestPayloadToCommit: () => payload,
    targetVerifiedStatus: 'VERIFIED_FOR_EXTRACTION',
    k: 2
  });
  assert.strictEqual(res1.success, true);

  // Now an adversary captures (sig1, nonce1) and attempts to replay it in session 2
  const record2 = {
    hexId: '0xTEST_REPLAY_2',
    status: 'PENDING_INSPECTION_SIGNATURES',
    signatures: []
  };

  // Session 2 has a fresh random nonce
  rotateApprovalSession(record2.hexId, 'CADAVER_VERIFIED_BLOCK', 'CIFV', computePayloadHash(payload));

  const replayRes = processThresholdApproval({
    record: record2,
    recordId: record2.hexId,
    doctorId: 'CIFV-DOC-101',
    providedSignature: sig1,
    providedNonce: nonce1, // replayed stale nonce from session 1
    dept: 'CIFV',
    milestoneType: 'CADAVER_VERIFIED_BLOCK',
    payloadToSign: payload,
    getLatestPayloadToCommit: () => payload,
    targetVerifiedStatus: 'VERIFIED_FOR_EXTRACTION',
    k: 2
  });

  assert.strictEqual(replayRes.success, false);
  assert.strictEqual(replayRes.status, 400);
  assert.match(replayRes.error, /Replay attack rejected/);
});

// --------------------------------------------------------------------------
// 8. Blockchain Integrity & Merkle Tamper Detection
// --------------------------------------------------------------------------
console.log('\n--- 8. Testing Post-Commit Blockchain & Merkle Tree Verification ---');

it('Block edited after commit causes chain and Merkle check to fail', () => {
  // Chain currently valid
  const validationBefore = ledger.isChainValid();
  assert.strictEqual(validationBefore.valid, true);

  // Find a mined block with transactions
  const blockIdx = ledger.chain.length - 1;
  const targetBlock = ledger.chain[blockIdx];
  assert.ok(targetBlock.transactions.length > 0);

  // Tamper with transaction in mined block
  const originalTx = targetBlock.transactions[0];
  const originalPatient = originalTx.payload.patientName;
  originalTx.payload.patientName = 'Adversary Tampered Donor';

  // Check validation
  const validationAfter = ledger.isChainValid();
  assert.strictEqual(validationAfter.valid, false, 'Chain validation must detect block tampering');

  // Restore transaction
  originalTx.payload.patientName = originalPatient;
});

it('simulateTamper route endpoint detects unauthorized payload tampering and reports tamperDetected: true', () => {
  assert.ok(ledger.chain.length >= 2, 'Need at least 2 blocks to simulate tampering');
  const targetBlock = ledger.chain[1];
  const originalPayload = { ...targetBlock.transactions[0].payload };

  // Alter payload as done in POST /api/blockchain/simulate-tamper
  targetBlock.transactions[0].payload = {
    ...targetBlock.transactions[0].payload,
    TAMPERED_FIELD: 'MALICIOUS_DATA'
  };

  const check = ledger.isChainValid();
  assert.strictEqual(check.valid, false, 'Tampered block payload must invalidate chain');
  assert.match(check.error, /payload tampered/);

  // Restore
  targetBlock.transactions[0].payload = originalPayload;
  assert.strictEqual(ledger.isChainValid().valid, true, 'Chain must be valid after restoration');
});

// Cleanup test ledger modifications
restoreLedger();

console.log('\n========================================================================');
console.log(` STEP 1 TESTS COMPLETE: ${passed} passed, ${failed} failed.`);
console.log('========================================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
