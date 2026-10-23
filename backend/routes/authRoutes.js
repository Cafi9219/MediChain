import express from 'express';
import { CONSORTIUM_CREDENTIALS } from '../data/doctors.js';

const router = express.Router();

// In-memory captcha store with TTL
const captchaStore = new Map();

function generateCaptcha() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let text = '';
  for (let i = 0; i < 5; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const id = 'CAP_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  captchaStore.set(id, { text, expiresAt: Date.now() + 5 * 60 * 1000 });
  return { id, text };
}

// GET /api/auth/captcha
router.get('/captcha', (req, res) => {
  const captcha = generateCaptcha();
  res.json({ success: true, captchaId: captcha.id, captchaCode: captcha.text });
});

// POST /api/auth/login (Department Level)
router.post('/login', (req, res) => {
  const { departmentId, password, captchaId, captchaInput } = req.body;

  // 1. Verify Captcha
  if (!captchaId || !captchaInput) {
    return res.status(400).json({ success: false, error: 'Captcha code is required.' });
  }
  const cached = captchaStore.get(captchaId);
  if (!cached || Date.now() > cached.expiresAt) {
    captchaStore.delete(captchaId);
    return res.status(400).json({ success: false, error: 'Captcha expired. Please reload.' });
  }
  if (cached.text.toUpperCase() !== captchaInput.trim().toUpperCase()) {
    captchaStore.delete(captchaId);
    return res.status(400).json({ success: false, error: 'Incorrect captcha code entered.' });
  }
  captchaStore.delete(captchaId); // One-time use

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

  if (matchedDept.password !== password) {
    return res.status(401).json({ success: false, error: 'Invalid Department Access Password.' });
  }

  // Success
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

// GET /api/auth/doctors
router.get('/doctors', (req, res) => {
  const dept = req.query.department;
  let list = CONSORTIUM_CREDENTIALS.personnel;
  if (dept) {
    list = list.filter(d => d.department.toUpperCase() === dept.toUpperCase());
  }
  res.json({ success: true, count: list.length, doctors: list });
});

// POST /api/auth/verify-doctor (For 2-of-3 Multi-Signature)
router.post('/verify-doctor', (req, res) => {
  const { doctorId, pin, captchaId, captchaInput } = req.body;

  // Verify Captcha
  if (captchaId && captchaInput) {
    const cached = captchaStore.get(captchaId);
    if (!cached || cached.text.toUpperCase() !== captchaInput.trim().toUpperCase()) {
      return res.status(400).json({ success: false, error: 'Invalid captcha code.' });
    }
    captchaStore.delete(captchaId);
  }

  const doc = CONSORTIUM_CREDENTIALS.personnel.find(d => d.id.toUpperCase() === (doctorId || '').trim().toUpperCase());
  if (!doc) {
    return res.status(404).json({ success: false, error: 'Medical Officer ID not registered in Consortium.' });
  }

  if (doc.pin !== pin) {
    return res.status(401).json({ success: false, error: 'Incorrect Security PIN for Medical Officer.' });
  }

  res.json({
    success: true,
    doctor: {
      id: doc.id,
      name: doc.name,
      role: doc.role,
      department: doc.department,
      regNumber: doc.regNumber,
      publicKey: doc.publicKey
    }
  });
});

export default router;
