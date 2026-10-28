/**
 * Setup Script: Provision Real Cryptographic ECDSA P-256 Keystore
 *
 * Generates fresh, cryptographically random SECP256R1 (P-256) key pairs for:
 * - The 9 Consortium Medical & Regulatory Specialists
 * - The CTORB System Coordinator Node
 *
 * Encrypts private keys at rest with AES-256-GCM using scrypt key derivation from specialist PINs.
 * Updates backend/data/doctors.js with matching public keys.
 * Keystore is stored at backend/data/keystore.json (gitignored).
 *
 * Usage:
 *   node backend/scripts/generate_keystore.js
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const KEYSTORE_FILE = path.join(DATA_DIR, 'keystore.json');
const DOCTORS_FILE = path.join(DATA_DIR, 'doctors.js');

const SPECIALIST_CONFIG = [
  // CIFV Department
  { id: 'CIFV-DOC-101', name: 'Dr. Rajesh Sharma', pin: '1010' },
  { id: 'CIFV-DOC-102', name: 'Dr. Ananya Iyer', pin: '1020' },
  { id: 'CIFV-DOC-103', name: 'Dr. Vikram Malhotra', pin: '1030' },
  // SROPS Department
  { id: 'SROPS-SUR-201', name: 'Dr. Sunil Kulkarni', pin: '2010' },
  { id: 'SROPS-SUR-202', name: 'Dr. Neha Deshmukh', pin: '2020' },
  { id: 'SROPS-SUR-203', name: 'Dr. Arvind Menon', pin: '2030' },
  // CTORB Admin Department
  { id: 'CTORB-ADM-301', name: 'Dir. B. K. Raman', pin: '3010' },
  { id: 'CTORB-ADM-302', name: 'Dr. Kavita Nair', pin: '3020' },
  { id: 'CTORB-ADM-303', name: 'Insp. Sanjay Verma', pin: '3030' },
  // System Coordinator
  { id: 'CTORB-SYS-001', name: 'CTORB System Coordinator', pin: 'Pass@admin2026' }
];

console.log('========================================================================');
console.log(' PROVISIONING RANDOM ECDSA P-256 CONSORTIUM KEYSTORE');
console.log('========================================================================\n');

const keystore = {};
const publicKeyMap = {};

for (const spec of SPECIALIST_CONFIG) {
  // 1. Generate truly random EC P-256 keypair
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1'
  });

  const pubDer = publicKey.export({ type: 'spki', format: 'der' });
  const pubHex = '0x' + pubDer.toString('hex');
  publicKeyMap[spec.id] = pubHex;

  // 2. Encrypt private key with AES-256-GCM using scrypt-derived key from PIN
  const privDer = privateKey.export({ type: 'pkcs8', format: 'der' });
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);

  // scrypt key derivation (N=16384, r=8, p=1)
  const encKey = crypto.scryptSync(spec.pin, salt, 32, { N: 16384, r: 8, p: 1 });
  const cipher = crypto.createCipheriv('aes-256-gcm', encKey, iv);
  const ciphertext = Buffer.concat([cipher.update(privDer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Clean transient key buffers
  privDer.fill(0);
  encKey.fill(0);

  keystore[spec.id] = {
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    ciphertext: ciphertext.toString('hex'),
    publicKey: pubHex,
    generatedAt: new Date().toISOString()
  };

  console.log(`  [OK] Provisioned keypair for ${spec.id} (${spec.name})`);
}

// 3. Write keystore to disk (gitignored)
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.writeFileSync(KEYSTORE_FILE, JSON.stringify(keystore, null, 2), 'utf-8');
console.log(`\n  Keystore successfully written to: ${KEYSTORE_FILE}`);

// 4. Update doctors.js with matching public keys
let doctorsContent = fs.readFileSync(DOCTORS_FILE, 'utf-8');
for (const [id, pubHex] of Object.entries(publicKeyMap)) {
  if (id === 'CTORB-SYS-001') continue; // system key not in personnel array
  const regex = new RegExp(`(id:\\s*'${id}'[\\s\\S]*?publicKey:\\s*')[^']+(')`);
  if (regex.test(doctorsContent)) {
    doctorsContent = doctorsContent.replace(regex, `$1${pubHex}$2`);
  }
}
fs.writeFileSync(DOCTORS_FILE, doctorsContent, 'utf-8');
console.log(`  Specialist public keys registered in: ${DOCTORS_FILE}`);

console.log('\n========================================================================');
console.log(' KEYSTORE SETUP COMPLETE: 10 random ECDSA P-256 keypairs provisioned.');
console.log(' No private keys or PINs are exported or exposed.');
console.log('========================================================================\n');
