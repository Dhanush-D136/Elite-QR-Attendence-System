const crypto = require('crypto');

const SECRET_KEY = process.env.QR_SECRET || 'smartattend_super_secret_qr_key_2026';
const WINDOW_SECONDS = 30;

/**
 * Generates standardized dynamic QR payload containing sessionId, attendanceCode, and subject
 */
function generateDynamicToken(sessionId, attendanceCode = '4821', subject = 'Operating Systems') {
  const nowMs = Date.now();
  const timeWindow = Math.floor(nowMs / (WINDOW_SECONDS * 1000));
  const expiresAt = (timeWindow + 1) * WINDOW_SECONDS * 1000;
  const salt = crypto.randomBytes(4).toString('hex');

  const rawData = `${sessionId}:${attendanceCode}:${timeWindow}:${salt}`;
  const signature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(rawData)
    .digest('hex')
    .substring(0, 16);

  const payload = {
    sessionId,
    attendanceCode,
    subject,
    tw: timeWindow,
    salt,
    sig: signature,
    exp: expiresAt,
    freshness: Math.max(0, Math.floor((expiresAt - nowMs) / 1000))
  };

  // Convert to JSON base64 string
  const tokenString = Buffer.from(JSON.stringify(payload)).toString('base64');
  return { token: tokenString, payload };
}

/**
 * Validates a scanned QR token
 */
function verifyDynamicToken(tokenString, expectedSessionId) {
  try {
    const jsonStr = Buffer.from(tokenString, 'base64').toString('utf-8');
    const payload = JSON.parse(jsonStr);

    if (expectedSessionId && payload.sessionId !== expectedSessionId) {
      return { valid: false, reason: 'SESSION_MISMATCH' };
    }

    const nowMs = Date.now();
    const currentTimeWindow = Math.floor(nowMs / (WINDOW_SECONDS * 1000));

    if (Math.abs(currentTimeWindow - payload.tw) > 1) {
      return { valid: false, reason: 'EXPIRED_QR' };
    }

    const rawData = `${payload.sessionId}:${payload.attendanceCode || ''}:${payload.tw}:${payload.salt}`;
    const expectedSig = crypto
      .createHmac('sha256', SECRET_KEY)
      .update(rawData)
      .digest('hex')
      .substring(0, 16);

    if (payload.sig !== expectedSig) {
      return { valid: false, reason: 'INVALID_SIGNATURE' };
    }

    return { valid: true, payload };
  } catch (err) {
    return { valid: false, reason: 'MALFORMED_TOKEN' };
  }
}

module.exports = { generateDynamicToken, verifyDynamicToken };
