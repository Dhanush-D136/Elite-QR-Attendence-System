const crypto = require('crypto');

const SECRET_KEY = process.env.QR_SECRET || 'smartattend_super_secret_qr_key_2026';
const WINDOW_SECONDS = 6; // 6-second dynamic rotation interval

/**
 * Generates standardized real-time dynamic QR payload containing:
 * sessionId, subjectId, facultyId, timestamp, nonce, expiresAt, signature
 */
function generateDynamicToken(sessionId, subjectId = 'SUB-101', facultyId = 'FAC-001') {
  const nowMs = Date.now();
  const expiresAt = nowMs + 6500;
  const nonce = crypto.randomBytes(6).toString('hex').toUpperCase();

  const rawData = `${sessionId}:${subjectId}:${facultyId}:${nowMs}:${nonce}:${expiresAt}`;
  const signature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(rawData)
    .digest('hex')
    .substring(0, 24);

  const payload = {
    sessionId,
    subjectId,
    facultyId,
    timestamp: nowMs,
    nonce,
    expiresAt,
    signature
  };

  // Convert to JSON string and base64 for easy transport / QR rendering
  const tokenString = JSON.stringify(payload);
  return { token: tokenString, payload };
}

/**
 * Validates a scanned QR payload signature
 */
function verifyDynamicTokenSignature(payload) {
  try {
    if (!payload || !payload.sessionId || !payload.nonce || !payload.signature || !payload.timestamp || !payload.expiresAt) {
      return { valid: false, reason: 'MALFORMED_PAYLOAD' };
    }

    const rawData = `${payload.sessionId}:${payload.subjectId || ''}:${payload.facultyId || ''}:${payload.timestamp}:${payload.nonce}:${payload.expiresAt}`;
    const expectedSig = crypto
      .createHmac('sha256', SECRET_KEY)
      .update(rawData)
      .digest('hex')
      .substring(0, 24);

    if (payload.signature !== expectedSig) {
      return { valid: false, reason: 'INVALID_SIGNATURE' };
    }

    return { valid: true, payload };
  } catch (err) {
    return { valid: false, reason: 'VERIFICATION_ERROR' };
  }
}

module.exports = { generateDynamicToken, verifyDynamicTokenSignature, WINDOW_SECONDS };
