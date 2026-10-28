import crypto from 'crypto';
import {
  generateDoctorSignatureHmac,
  verifyDoctorSignatureHmac,
  LEGACY_SHARED_SECRET
} from './legacyHmac.js';

export function sha256(data) {
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  return crypto.createHash('sha256').update(str).digest('hex');
}

export function computeMerkleRoot(transactions) {
  if (!transactions || transactions.length === 0) {
    return sha256('EMPTY_MERKLE_ROOT');
  }

  let hashes = transactions.map(tx => tx.hash || sha256(tx));

  while (hashes.length > 1) {
    if (hashes.length % 2 !== 0) {
      hashes.push(hashes[hashes.length - 1]);
    }
    const nextLevel = [];
    for (let i = 0; i < hashes.length; i += 2) {
      nextLevel.push(sha256(hashes[i] + hashes[i + 1]));
    }
    hashes = nextLevel;
  }

  return hashes[0];
}

// Re-export legacy HMAC mechanisms for Baseline B0 experiments
export { generateDoctorSignatureHmac, verifyDoctorSignatureHmac, LEGACY_SHARED_SECRET };
export const generateDoctorSignature = generateDoctorSignatureHmac;
export const verifyDoctorSignature = verifyDoctorSignatureHmac;
