const API_BASE = 'http://localhost:5000';

/**
 * Resolves any image value to a full displayable URL.
 * - Full URL (http/https) → as-is
 * - Relative path (/static/uploads/...) → prefixed with API_BASE
 * - Empty/null → fallback image
 */
export function resolveImg(raw, fallback = '/images/deluxe-room.jpg') {
  if (!raw) return fallback;
  if (typeof raw === 'string' && (raw.startsWith('http') || raw.startsWith('data:') || raw.startsWith('blob:'))) return raw;
  if (typeof raw === 'string' && raw.startsWith('/images/')) return raw;
  return `${API_BASE}${raw.startsWith('/') ? '' : '/'}${raw}`;
}

export default resolveImg;
