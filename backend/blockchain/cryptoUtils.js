import crypto from 'crypto';

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

export function generateDoctorSignature(doctorId, doctorName, dataHash, secret = 'CONSORTIUM_ORGAN_SECRET_2026') {
  const payload = `${doctorId}:${doctorName}:${dataHash}`;
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return {
    signatureHash: '0x' + sig,
    timestamp: new Date().toISOString(),
    publicKey: 'PK_' + sha256(doctorId + doctorName).substring(0, 24)
  };
}

export function verifyDoctorSignature(doctorId, doctorName, dataHash, signatureHash, secret = 'CONSORTIUM_ORGAN_SECRET_2026') {
  const expected = '0x' + crypto.createHmac('sha256', secret).update(`${doctorId}:${doctorName}:${dataHash}`).digest('hex');
  return expected === signatureHash;
}
