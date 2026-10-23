const BASE_URL = '/api';

export async function fetchCaptcha() {
  const res = await fetch(`${BASE_URL}/auth/captcha`);
  return res.json();
}

export async function loginDepartment(departmentId, password, captchaId, captchaInput) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ departmentId, password, captchaId, captchaInput })
  });
  return res.json();
}

export async function fetchDoctors(department = '') {
  const url = department ? `${BASE_URL}/auth/doctors?department=${department}` : `${BASE_URL}/auth/doctors`;
  const res = await fetch(url);
  return res.json();
}

export async function verifyDoctor(doctorId, pin, captchaId = '', captchaInput = '') {
  const res = await fetch(`${BASE_URL}/auth/verify-doctor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ doctorId, pin, captchaId, captchaInput })
  });
  return res.json();
}

// Cadaver endpoints (CIFV)
export async function submitCadaver(data) {
  const res = await fetch(`${BASE_URL}/cadavers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function fetchCadavers(status = '') {
  const url = status ? `${BASE_URL}/cadavers?status=${status}` : `${BASE_URL}/cadavers`;
  const res = await fetch(url);
  return res.json();
}

export async function signCadaver(hexId, doctorId, pin) {
  const res = await fetch(`${BASE_URL}/cadavers/${hexId}/sign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ doctorId, pin })
  });
  return res.json();
}

// Organ endpoints (SROPS)
export async function submitOrganHarvest(data) {
  const res = await fetch(`${BASE_URL}/organs/harvest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function fetchHarvestReports() {
  const res = await fetch(`${BASE_URL}/organs/reports`);
  return res.json();
}

export async function fetchOrgansList() {
  const res = await fetch(`${BASE_URL}/organs/list`);
  return res.json();
}

export async function signOrganHarvest(reportId, doctorId, pin) {
  const res = await fetch(`${BASE_URL}/organs/reports/${reportId}/sign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ doctorId, pin })
  });
  return res.json();
}

// Blockchain endpoints
export async function fetchBlockchain(role = 'ADMIN') {
  const res = await fetch(`${BASE_URL}/blockchain`, {
    headers: { 'x-department-role': role }
  });
  return res.json();
}

export async function verifyBlockchainIntegrity() {
  const res = await fetch(`${BASE_URL}/blockchain/verify`);
  return res.json();
}

export async function simulateTamper() {
  const res = await fetch(`${BASE_URL}/blockchain/simulate-tamper`, { method: 'POST' });
  return res.json();
}

// Admin endpoints
export async function fetchAdminOverview() {
  const res = await fetch(`${BASE_URL}/admin/overview`);
  return res.json();
}

// Deadlines endpoint (uses backend /api/deadlines when available, graceful fallback otherwise)
export async function fetchDeadlines() {
  try {
    const res = await fetch(`${BASE_URL}/deadlines`);
    if (!res.ok) return { success: false, deadlines: null };
    return await res.json();
  } catch {
    return { success: false, deadlines: null };
  }
}
