import express from 'express';
import crypto from 'crypto';
import { CONSORTIUM_CREDENTIALS } from '../data/doctors.js';
import { verifyDoctorPinSecure, sanitizeSpecialist } from '../security/authSecurity.js';
import { generateCaptcha, validateCaptchaServerSide } from '../security/captchaSecurity.js';

const router = express.Router();

// GET /api/auth/captcha
router.get('/captcha', (req, res) => {
  const captcha = generateCaptcha();
  res.json({ success: true, captchaId: captcha.id, captchaCode: captcha.text });
});

// POST /api/auth/login (Department Level)
router.post('/login', (req, res) => {
  const { departmentId, password, captchaId, captchaInput } = req.body;

  // 1. Server-side Captcha validation (Fail-closed, single-use, expiring)
  const captchaResult = validateCaptchaServerSide(captchaId, captchaInput);
  if (!captchaResult.valid) {
    return res.status(400).json({ success: false, error: captchaResult.error });
  }

  // 2. Check Department Credentials
  const depts = CONSORTIUM_CREDENTIALS.departments;
  let matchedDept = null;
  for (const key of Object.keys(depts)) {
    if (depts[key].id.toUpperCase() === (departmentId || '').trim().toUpperCase()) {
      matchedDept = depts[key];
      break;
    }
  }

  if (!matchedDept) {
    return res.status(401).json({ success: false, error: 'Invalid Department Medical ID.' });
  }

  if (matchedDept.role === 'EXTERNAL') {
    return res.status(403).json({
      success: false,
      isExternalRestricted: true,
      error: 'External Recipient Hospital access is restricted under Phase 2 consortium security guidelines.'
    });
  }

  // Check password against environment variable with fallback to demo password
  const envPasswordKey = `DEPT_${matchedDept.role}_PASSWORD`;
  const expectedPassword = process.env[envPasswordKey] || matchedDept.password;

  // Constant-time password comparison
  const passBuf = Buffer.from(password || '');
  const expBuf = Buffer.from(expectedPassword || '');
  const isPassMatch = passBuf.length === expBuf.length && crypto.timingSafeEqual(passBuf, expBuf);

  if (!isPassMatch) {
    return res.status(401).json({ success: false, error: 'Invalid Department Access Password.' });
  }

  // Success: Return minimal public department profile
  return res.json({
    success: true,
    department: {
      id: matchedDept.id,
      name: matchedDept.name,
      role: matchedDept.role,
      badge: matchedDept.badge,
      description: matchedDept.description
    }
  });
});

// GET /api/auth/doctors - Role-sanitized specialist directory
router.get('/doctors', (req, res) => {
  const role = req.headers['x-department-role'] || req.query.role;
  if (role) {
    const norm = role.toUpperCase();
    if (norm === 'EXTERNAL' || norm === 'RTCN' || norm === 'EXTERNAL_HOSPITAL') {
      return res.status(403).json({
        success: false,
        error: 'CONSORTIUM_ACCESS_DENIED',
        message: 'External Recipient Hospital nodes are restricted from direct specialist roster queries.'
      });
    }
  }

  const dept = req.query.department;
  let list = CONSORTIUM_CREDENTIALS.personnel;
  if (dept) {
    list = list.filter(d => d.department.toUpperCase() === dept.toUpperCase());
  }

  // Strictly sanitize: NEVER leak PINs, passwords, or hashes
  const sanitizedList = list.map(d => sanitizeSpecialist(d));
  res.json({ success: true, count: sanitizedList.length, doctors: sanitizedList });
});

// POST /api/auth/verify-doctor (Specialist PIN validation with attempt limiting)
router.post('/verify-doctor', (req, res) => {
  const { doctorId, pin, captchaId, captchaInput } = req.body;

  // If captcha challenge was provided, validate fail-closed
  if (captchaId || captchaInput) {
    const captchaResult = validateCaptchaServerSide(captchaId, captchaInput);
    if (!captchaResult.valid) {
      return res.status(400).json({ success: false, error: captchaResult.error });
    }
  }

  // Secure constant-time verification with attempt lockout
  const authResult = verifyDoctorPinSecure(doctorId, pin);
  if (!authResult.success) {
    return res.status(authResult.status || 401).json({
      success: false,
      error: authResult.error
    });
  }

  res.json({
    success: true,
    doctor: authResult.doctor
  });
});

export default router;
