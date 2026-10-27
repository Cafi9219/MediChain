// Server-side Captcha store with TTL and single-use enforcement
const captchaStore = new Map();
const CAPTCHA_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes TTL

/**
 * Generate a new random 5-character alphanumeric captcha
 */
export function generateCaptcha() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let text = '';
  for (let i = 0; i < 5; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const id = 'CAP_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  captchaStore.set(id, { text, expiresAt: Date.now() + CAPTCHA_EXPIRY_MS });
  return { id, text };
}

/**
 * Validate captcha strictly on the server:
 * - Fails closed if missing, malformed, or non-string
 * - Checks 5-minute expiration
 * - Single-use token: token is deleted immediately upon any verification attempt
 */
export function validateCaptchaServerSide(captchaId, captchaInput) {
  if (!captchaId || typeof captchaId !== 'string' || !captchaInput || typeof captchaInput !== 'string') {
    return {
      valid: false,
      error: 'Security validation failed: Captcha ID and user input code are both required.'
    };
  }

  const cached = captchaStore.get(captchaId);
  if (!cached) {
    return {
      valid: false,
      error: 'Invalid or already-consumed captcha token. Please request a new captcha.'
    };
  }

  // Token is single-use: delete immediately
  captchaStore.delete(captchaId);

  if (Date.now() > cached.expiresAt) {
    return {
      valid: false,
      error: 'Captcha expired. Please reload and enter a new captcha.'
    };
  }

  if (cached.text.toUpperCase() !== captchaInput.trim().toUpperCase()) {
    return {
      valid: false,
      error: 'Incorrect captcha code entered.'
    };
  }

  return { valid: true };
}

/**
 * Clean up expired tokens periodically
 */
export function purgeExpiredCaptchas() {
  const now = Date.now();
  for (const [id, record] of captchaStore.entries()) {
    if (now > record.expiresAt) {
      captchaStore.delete(id);
    }
  }
}
const cleanupInterval = setInterval(purgeExpiredCaptchas, 60 * 1000);
if (cleanupInterval.unref) {
  cleanupInterval.unref();
}
