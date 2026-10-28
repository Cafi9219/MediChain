import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CONSORTIUM_CREDENTIALS } from '../data/doctors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const KEYSTORE_FILE = path.join(__dirname, '..', 'data', 'keystore.json');

// Default initial specialist evaluation PINs for automated testing
const DEFAULT_PINS = {
  'CIFV-DOC-101': '1010',
  'CIFV-DOC-102': '1020',
  'CIFV-DOC-103': '1030',
  'SROPS-SUR-201': '2010',
  'SROPS-SUR-202': '2020',
  'SROPS-SUR-203': '2030',
  'CTORB-ADM-301': '3010',
  'CTORB-ADM-302': '3020',
  'CTORB-ADM-303': '3030',
  'CTORB-SYS-001': 'Pass@admin2026'
};

let inMemoryKeystore = null;

/**
 * Decrypts private key bytes using doctor's PIN and returns KeyObject
 */
function decryptPrivateKey(entry, pin) {
  const salt = Buffer.from(entry.salt, 'hex');
  const iv = Buffer.from(entry.iv, 'hex');
  const authTag = Buffer.from(entry.authTag, 'hex');
  const ciphertext = Buffer.from(entry.ciphertext, 'hex');

  // scrypt key derivation (N=16384, r=8, p=1)
  const encKey = crypto.scryptSync(pin, salt, 32, { N: 16384, r: 8, p: 1 });
  const decipher = crypto.createDecipheriv('aes-256-gcm', encKey, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  const privateKey = crypto.createPrivateKey({
    key: decrypted,
    format: 'der',
    type: 'pkcs8'
  });

  // Zero-fill decrypted buffer for forward secrecy
  decrypted.fill(0);
  encKey.fill(0);
  return privateKey;
}

/**
 * Initializes the keystore from disk. If missing, runs random key generation.
 */
export function initKeystore() {
  if (inMemoryKeystore) {
    return inMemoryKeystore;
  }

  if (fs.existsSync(KEYSTORE_FILE)) {
    try {
      const raw = fs.readFileSync(KEYSTORE_FILE, 'utf-8');
      inMemoryKeystore = JSON.parse(raw);
      return inMemoryKeystore;
    } catch (err) {
      console.warn('Could not read existing keystore, provisioning fresh keystore:', err.message);
    }
  }

  // Provision fresh random keypairs if keystore.json is not present
  const keystoreData = {};
  const allIds = [
    ...CONSORTIUM_CREDENTIALS.personnel.map(p => p.id),
    'CTORB-SYS-001'
  ];

  for (const id of allIds) {
    const pin = DEFAULT_PINS[id] || '1010';
    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(12);

    const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1'
    });

    const privDer = privateKey.export({ type: 'pkcs8', format: 'der' });
    const encKey = crypto.scryptSync(pin, salt, 32, { N: 16384, r: 8, p: 1 });
    const cipher = crypto.createCipheriv('aes-256-gcm', encKey, iv);
    const ciphertext = Buffer.concat([cipher.update(privDer), cipher.final()]);
    const authTag = cipher.getAuthTag();

    privDer.fill(0);
    encKey.fill(0);

    const pubHex = '0x' + publicKey.export({ type: 'spki', format: 'der' }).toString('hex');

    keystoreData[id] = {
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      ciphertext: ciphertext.toString('hex'),
      publicKey: pubHex,
      generatedAt: new Date().toISOString()
    };
  }

  try {
    fs.mkdirSync(path.dirname(KEYSTORE_FILE), { recursive: true });
    fs.writeFileSync(KEYSTORE_FILE, JSON.stringify(keystoreData, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to write keystore to disk (running in-memory only):', err.message);
  }

  inMemoryKeystore = keystoreData;
  return inMemoryKeystore;
}

/**
 * Signs a digest buffer using a doctor's PIN (decrypting private key in memory)
 */
export function signDigestWithDoctorPin(doctorId, pin, digest) {
  const keystore = initKeystore();
  const entry = keystore[doctorId];
  if (!entry) {
    throw new Error(`Doctor ID '${doctorId}' not registered in consortium keystore`);
  }

  let privateKey;
  try {
    privateKey = decryptPrivateKey(entry, pin);
  } catch (err) {
    throw new Error('Keystore decryption failed: Invalid specialist PIN or corrupted entry');
  }

  const sign = crypto.createSign('SHA256');
  sign.update(Buffer.isBuffer(digest) ? digest : Buffer.from(digest.replace(/^0x/, ''), 'hex'));
  const sigDerHex = sign.sign(privateKey, 'hex');

  return {
    signature: '0x' + sigDerHex,
    publicKey: entry.publicKey,
    algorithm: 'ECDSA_P256_SHA256'
  };
}

/**
 * Direct ECDSA P-256 sign without scrypt key derivation (for benchmarking pure crypto speed)
 */
export function signDigestDirect(privateKeyObj, digest) {
  const sign = crypto.createSign('SHA256');
  sign.update(Buffer.isBuffer(digest) ? digest : Buffer.from(digest.replace(/^0x/, ''), 'hex'));
  return '0x' + sign.sign(privateKeyObj, 'hex');
}

/**
 * Unlocks a private key once and returns the KeyObject (for benchmark timing separation)
 */
export function unlockPrivateKey(doctorId, pin) {
  const keystore = initKeystore();
  const entry = keystore[doctorId];
  if (!entry) throw new Error(`Doctor ID '${doctorId}' not found`);
  return decryptPrivateKey(entry, pin);
}

/**
 * Signs a digest with the CTORB system key (used for autonomous milestone/escalation anchoring)
 */
export function signDigestWithSystemKey(digest) {
  const pin = DEFAULT_PINS['CTORB-SYS-001'];
  return signDigestWithDoctorPin('CTORB-SYS-001', pin, digest);
}

/**
 * Verifies an ECDSA P-256 signature against a SPKI public key (hex or PEM)
 */
export function verifyDigestWithPublicKey(publicKey, digest, signature) {
  try {
    let pubKeyObj;
    if (typeof publicKey === 'string' && (publicKey.startsWith('0x') || /^[0-9a-fA-F]+$/.test(publicKey))) {
      const derBuf = Buffer.from(publicKey.replace(/^0x/, ''), 'hex');
      pubKeyObj = crypto.createPublicKey({ key: derBuf, format: 'der', type: 'spki' });
    } else {
      pubKeyObj = crypto.createPublicKey(publicKey);
    }

    const verify = crypto.createVerify('SHA256');
    verify.update(Buffer.isBuffer(digest) ? digest : Buffer.from(digest.replace(/^0x/, ''), 'hex'));
    const sigCleanHex = signature.replace(/^0x/, '');
    return verify.verify(pubKeyObj, sigCleanHex, 'hex');
  } catch (err) {
    return false;
  }
}

/**
 * Look up registered public key by doctorId
 */
export function getRegisteredPublicKey(doctorId) {
  const keystore = initKeystore();
  const entry = keystore[doctorId];
  return entry ? entry.publicKey : null;
}

// Auto-initialize keystore
initKeystore();
