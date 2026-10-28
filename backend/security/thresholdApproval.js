/**
 * ECDSA P-256 2-of-3 Multi-Party Threshold Consensus Engine (Algorithm 1)
 *
 * Implements:
 * - Deterministic P-256 ECDSA digital signatures
 * - Per-session random nonces & replay rejection
 * - Department-authorized signer validation
 * - Duplicate signer detection
 * - Pre-commit and commit-time payload integrity verification
 * - Threshold commit (k = 2 required approvals out of 3 specialists)
 */

import crypto from 'crypto';
import { sha256 } from '../blockchain/cryptoUtils.js';
import { CONSORTIUM_CREDENTIALS } from '../data/doctors.js';
import {
  signDigestWithDoctorPin,
  verifyDigestWithPublicKey,
  getRegisteredPublicKey
} from './keystore.js';
import { verifyDoctorPinSecure } from './authSecurity.js';
import { ledger } from '../blockchain/blockchain.js';
import { Transaction } from '../blockchain/transaction.js';

// Server-side active approval sessions: recordId -> Session
const activeSessions = new Map();

// Global set of permanently consumed nonces to prevent cross-session replay
const consumedNonces = new Set();

/**
 * Computes canonical payload hash
 */
export function computePayloadHash(payload) {
  if (typeof payload === 'string') {
    return sha256(payload);
  }
  // Sort keys for deterministic JSON serialization
  const canonical = JSON.stringify(payload, Object.keys(payload).sort());
  return sha256(canonical);
}

/**
 * Computes approval digest:
 * m_d = SHA256(type || SHA256(payload) || dept || nonce_d)
 */
export function computeApprovalDigest(milestoneType, payloadHash, dept, nonce) {
  const message = `${milestoneType}${payloadHash}${dept}${nonce}`;
  return sha256(message);
}

/**
 * Get or initiate an approval session for a record
 */
export function getOrCreateApprovalSession(recordId, milestoneType, dept, payloadHash) {
  let session = activeSessions.get(recordId);
  if (!session) {
    const nonce = crypto.randomBytes(16).toString('hex');
    session = {
      recordId,
      milestoneType,
      dept,
      payloadHash,
      nonce,
      createdAt: Date.now(),
      status: 'PENDING'
    };
    activeSessions.set(recordId, session);
  }
  return session;
}

/**
 * Reset/force a new session (useful for replay testing)
 */
export function rotateApprovalSession(recordId, milestoneType, dept, payloadHash) {
  const oldSession = activeSessions.get(recordId);
  if (oldSession) {
    consumedNonces.add(oldSession.nonce);
  }
  const nonce = crypto.randomBytes(16).toString('hex');
  const session = {
    recordId,
    milestoneType,
    dept,
    payloadHash,
    nonce,
    createdAt: Date.now(),
    status: 'PENDING'
  };
  activeSessions.set(recordId, session);
  return session;
}

/**
 * Algorithm 1: Execute Specialist Approval & Threshold Evaluation
 *
 * @param {Object} options
 * @param {Object} options.record - Target record (cadaver or harvest report)
 * @param {string} options.recordId - Record identifier (hexId or reportId)
 * @param {string} options.doctorId - ID of specialist attempting to sign
 * @param {string} options.pin - Specialist PIN (for PIN-authenticated sign flow)
 * @param {string} [options.providedSignature] - Directly provided ECDSA signature (for external sign tests)
 * @param {string} [options.providedNonce] - Replay test nonce (if verifying pre-signed payload)
 * @param {string} options.dept - Authorized department ('CIFV' or 'SROPS')
 * @param {string} options.milestoneType - Milestone block transaction type
 * @param {Object} options.payloadToSign - Payload to bind cryptographically
 * @param {Function} options.getLatestPayloadToCommit - Callback returning fresh payload at commit time
 * @param {string} options.targetVerifiedStatus - Status string when threshold is met
 * @param {string} options.validatorNode - Blockchain validator node name
 * @param {number} [options.k=2] - Threshold consensus requirement
 */
export function processThresholdApproval({
  record,
  recordId,
  doctorId,
  pin,
  providedSignature = null,
  providedNonce = null,
  dept,
  milestoneType,
  payloadToSign,
  getLatestPayloadToCommit,
  targetVerifiedStatus,
  validatorNode = 'CONSORTIUM_VALIDATOR_PRIMARY',
  k = 2
}) {
  // 1. Department & specialist existence authorization check
  const specialist = CONSORTIUM_CREDENTIALS.personnel.find(p => p.id === doctorId);
  if (!specialist) {
    return {
      success: false,
      status: 404,
      error: `Specialist '${doctorId}' not registered in consortium roster.`
    };
  }

  if (specialist.department !== dept) {
    return {
      success: false,
      status: 403,
      error: `Signer unauthorized: Specialist '${specialist.name}' belongs to department '${specialist.department}', but this milestone requires '${dept}'.`
    };
  }

  // 2. PIN verification (if PIN flow)
  if (pin) {
    const auth = verifyDoctorPinSecure(doctorId, pin, dept);
    if (!auth.success) {
      return {
        success: false,
        status: auth.status || 401,
        error: auth.error
      };
    }
  }

  // 3. Duplicate signer check
  if (!record.signatures) {
    record.signatures = [];
  }
  if (record.signatures.some(s => s.doctorId === doctorId)) {
    return {
      success: false,
      status: 400,
      error: `Duplicate signature rejected: Dr. ${specialist.name} (${doctorId}) has already signed this record.`
    };
  }

  // 4. Session & Replay Protection
  const payloadHash = computePayloadHash(payloadToSign);
  const session = getOrCreateApprovalSession(recordId, milestoneType, dept, payloadHash);

  const activeNonce = session.nonce;

  // If a specific nonce was supplied by the caller, verify it
  if (providedNonce) {
    if (consumedNonces.has(providedNonce)) {
      return {
        success: false,
        status: 400,
        error: 'Replay attack rejected: Signature was created for an expired or consumed approval session nonce.'
      };
    }
    if (providedNonce !== activeNonce) {
      return {
        success: false,
        status: 400,
        error: 'Replay attack rejected: Provided nonce does not match current active approval session.'
      };
    }
  }

  // 5. Compute cryptographic approval digest:
  // m_d = SHA256(type || SHA256(payload) || dept || nonce_d)
  const digest = computeApprovalDigest(milestoneType, payloadHash, dept, activeNonce);

  // 6. Signature generation or verification
  let signatureHex = providedSignature;
  if (!signatureHex) {
    try {
      const signRes = signDigestWithDoctorPin(doctorId, pin, digest);
      signatureHex = signRes.signature;
    } catch (err) {
      return {
        success: false,
        status: 500,
        error: `ECDSA signing failed: ${err.message}`
      };
    }
  }

  // Verify against registered public key
  const regPubKey = getRegisteredPublicKey(doctorId) || specialist.publicKey;
  const isSigValid = verifyDigestWithPublicKey(regPubKey, digest, signatureHex);
  if (!isSigValid) {
    return {
      success: false,
      status: 400,
      error: 'Cryptographic signature verification failed: Invalid ECDSA P-256 signature for registered specialist public key.'
    };
  }

  // 7. Append valid signature
  const signatureEntry = {
    doctorId: specialist.id,
    doctorName: specialist.name,
    role: specialist.role,
    department: specialist.department,
    regNumber: specialist.regNumber,
    signature: signatureHex,
    signatureHash: signatureHex, // preserved for UI backward-compatibility
    publicKey: regPubKey,
    digest,
    nonce: activeNonce,
    algorithm: 'ECDSA_P256_SHA256',
    timestamp: new Date().toISOString()
  };

  record.signatures.push(signatureEntry);

  // 8. Threshold check (k-of-n)
  let blockMined = null;
  const validSignaturesCount = record.signatures.length;

  if (validSignaturesCount < k) {
    return {
      success: true,
      message: `Signature registered for Dr. ${specialist.name}. Approvals: ${validSignaturesCount}/${k} (k-1 stays pending).`,
      signaturesCount: validSignaturesCount,
      status: record.status,
      isFullyVerified: false,
      blockMined: null,
      record
    };
  }

  // Threshold reached (>= k): Verify payload hash AGAIN at commit time
  const commitPayload = getLatestPayloadToCommit ? getLatestPayloadToCommit() : payloadToSign;
  const commitPayloadHash = computePayloadHash(commitPayload);

  if (commitPayloadHash !== payloadHash) {
    // Tamper detected! Roll back current signature
    record.signatures.pop();
    return {
      success: false,
      status: 409,
      error: 'Post-signature tampering detected at commit time: Payload hash does not match signed digest.'
    };
  }

  // Mark session nonce as permanently consumed
  consumedNonces.add(activeNonce);
  activeSessions.delete(recordId);

  // Transition milestone status
  record.status = targetVerifiedStatus;

  // Construct blockchain transaction & mine
  const tx = new Transaction({
    type: milestoneType,
    payload: {
      recordId,
      status: targetVerifiedStatus,
      signingDoctors: record.signatures.map(s => `${s.doctorName} (${s.doctorId})`),
      digitalSignatures: record.signatures.map(s => s.signature),
      recordHash: commitPayloadHash,
      nonce: activeNonce
    },
    senderDepartment: dept,
    submittedBy: specialist.name,
    signatures: record.signatures
  });

  ledger.addTransaction(tx);
  blockMined = ledger.minePendingTransactions(validatorNode);

  return {
    success: true,
    message: `Milestone verified! Multi-signature consensus reached (${validSignaturesCount}/${k} signatures). Block #${blockMined ? blockMined.index : 'PENDING'} mined.`,
    signaturesCount: validSignaturesCount,
    status: record.status,
    isFullyVerified: true,
    blockMined: blockMined ? { index: blockMined.index, hash: blockMined.hash } : null,
    record
  };
}
