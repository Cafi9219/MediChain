/**
 * Legacy HMAC-SHA256 Signing & Verification Baseline (B0)
 * 
 * Preserved strictly for experimental benchmarking and comparative evaluation
 * against the ECDSA P-256 threshold consensus protocol.
 */

import crypto from 'crypto';
import { sha256 } from './cryptoUtils.js';

export const LEGACY_SHARED_SECRET = 'CONSORTIUM_ORGAN_SECRET_2026';

/**
 * Generate legacy HMAC-SHA256 signature using shared consortium secret
 */
export function generateDoctorSignatureHmac(doctorId, doctorName, dataHash, secret = LEGACY_SHARED_SECRET) {
  const payload = `${doctorId}:${doctorName}:${dataHash}`;
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return {
    signatureHash: '0x' + sig,
    timestamp: new Date().toISOString(),
    publicKey: 'PK_' + sha256(doctorId + doctorName).substring(0, 24),
    algorithm: 'LEGACY_HMAC_SHA256'
  };
}

/**
 * Verify legacy HMAC-SHA256 signature
 */
export function verifyDoctorSignatureHmac(doctorId, doctorName, dataHash, signatureHash, secret = LEGACY_SHARED_SECRET) {
  const expected = '0x' + crypto.createHmac('sha256', secret).update(`${doctorId}:${doctorName}:${dataHash}`).digest('hex');
  return expected === signatureHash;
}
