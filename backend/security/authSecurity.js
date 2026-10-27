import crypto from 'crypto';
import { CONSORTIUM_CREDENTIALS } from '../data/doctors.js';

// Internal, private store for specialist PIN hashes and salts
// doctorId -> { salt: string, hash: Buffer }
const specialistCredentialsStore = new Map();

// In-memory attempt limiter: doctorId -> { failedCount: number, lockedUntil: number }
const loginAttemptsStore = new Map();

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

// Pre-computed dummy salt & hash to normalize response timing for non-existent doctor IDs
const DUMMY_SALT = crypto.randomBytes(16).toString('hex');
const DUMMY_HASH = crypto.scryptSync('DUMMY_PIN_VAL_9999', DUMMY_SALT, 64);

/**
 * Initialize credentials on module load.
 * Hashes demo PINs using per-user random salt (scrypt-64) and clears plaintext PINs from memory.
 */
export function initializeSpecialistCredentials() {
  for (const person of CONSORTIUM_CREDENTIALS.personnel) {
    const rawPin = person.pin || '0000';
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(rawPin, salt, 64);

    specialistCredentialsStore.set(person.id.toUpperCase(), {
      salt,
      hash,
      department: person.department
    });

    // Remove plaintext PIN from the public personnel object
    delete person.pin;
  }
}

// Automatically hash on startup
initializeSpecialistCredentials();

/**
 * Strip all sensitive security fields and return minimal public specialist data.
 */
export function sanitizeSpecialist(doctor) {
  if (!doctor) return null;
  return {
    id: doctor.id,
    name: doctor.name,
    department: doctor.department,
    role: doctor.role,
    regNumber: doctor.regNumber,
    experience: doctor.experience,
    hospital: doctor.hospital,
    publicKey: doctor.publicKey
  };
}

/**
 * Securely verify a doctor's PIN:
 * 1. Checks lockout threshold.
 * 2. Constant-time comparison using crypto.timingSafeEqual.
 * 3. Equalizes execution timing for invalid doctor IDs.
 * 4. Generic error messages to prevent username enumeration.
 */
export function verifyDoctorPinSecure(doctorId, inputPin, requiredDepartment = null) {
  const normId = (doctorId || '').trim().toUpperCase();
  const now = Date.now();

  // 1. Check attempt lockout
  const attemptRecord = loginAttemptsStore.get(normId);
  if (attemptRecord && attemptRecord.lockedUntil > now) {
    const remainingSecs = Math.ceil((attemptRecord.lockedUntil - now) / 1000);
    return {
      success: false,
      status: 429,
      error: `Security lockout: Account temporarily locked due to consecutive failed attempts. Retry in ${remainingSecs} seconds.`
    };
  }

  const creds = specialistCredentialsStore.get(normId);
  const docProfile = CONSORTIUM_CREDENTIALS.personnel.find(d => d.id.toUpperCase() === normId);

  // 2. Uniform timing execution if doctor ID does not exist
  if (!creds || !docProfile) {
    crypto.scryptSync(inputPin || '0000', DUMMY_SALT, 64);
    crypto.timingSafeEqual(DUMMY_HASH, DUMMY_HASH);
    return {
      success: false,
      status: 401,
      error: 'Authentication failed: Invalid specialist credentials or authorization.'
    };
  }

  // 3. Department authorization check
  if (requiredDepartment && creds.department.toUpperCase() !== requiredDepartment.toUpperCase()) {
    return {
      success: false,
      status: 403,
      error: `Access Denied: Specialist must belong to ${requiredDepartment} department.`
    };
  }

  // 4. Constant-time cryptographic verification
  const computedHash = crypto.scryptSync(inputPin || '', creds.salt, 64);
  const isValid = crypto.timingSafeEqual(creds.hash, computedHash);

  if (!isValid) {
    // Record failed attempt
    const currentFailed = (attemptRecord ? attemptRecord.failedCount : 0) + 1;
    const lockedUntil = currentFailed >= MAX_FAILED_ATTEMPTS ? now + LOCKOUT_DURATION_MS : 0;

    loginAttemptsStore.set(normId, { failedCount: currentFailed, lockedUntil });

    if (lockedUntil > 0) {
      return {
        success: false,
        status: 429,
        error: `Security lockout: Maximum failed PIN attempts reached (${MAX_FAILED_ATTEMPTS}). Account locked for 5 minutes.`
      };
    }

    return {
      success: false,
      status: 401,
      error: 'Authentication failed: Invalid specialist credentials or authorization.'
    };
  }

  // 5. Successful authentication: reset attempt counter
  loginAttemptsStore.delete(normId);

  return {
    success: true,
    doctor: sanitizeSpecialist(docProfile)
  };
}

/**
 * Reset lockout record (useful for testing)
 */
export function resetAttemptsForTest(doctorId) {
  if (doctorId) {
    loginAttemptsStore.delete(doctorId.toUpperCase());
  } else {
    loginAttemptsStore.clear();
  }
}
