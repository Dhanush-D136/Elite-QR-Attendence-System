function normalizeDate(value) {
  if (!value) return '';
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value);
}

function safeDateOnly(value) {
  const v = normalizeDate(value);
  if (!v) return '';
  return v.split('T')[0].split(' ')[0];
}

function safeTimeOnly(value) {
  const v = normalizeDate(value);
  if (!v) return '';

  if (v.includes('T')) {
    return v.split('T')[1]?.substring(0, 8) || '';
  }

  if (v.includes(' ')) {
    return v.split(' ')[1]?.substring(0, 8) || '';
  }

  return '';
}

module.exports = {
  normalizeDate,
  safeDateOnly,
  safeTimeOnly
};
