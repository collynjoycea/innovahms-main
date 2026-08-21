/**
 * Resolves any image value to a full displayable URL.
 * - Full URL (http/https) → as-is
 * - data:/blob: URLs → as-is
 * - Absolute path under /images/ (frontend public assets) → as-is
 * - Relative path (/static/uploads/...) → prefixed with API base
 * - Absolute /static/ path → prefixed with API base
 * - Empty/null → fallback image
 *
 * The API base is derived dynamically so uploaded room & hotel images
 * display correctly regardless of the frontend/backend origin or host.
 */
export function resolveImg(raw, fallback = '/images/deluxe-room.jpg') {
  if (!raw) return fallback;

  // Already a full URL or data/blob URI — use as-is
  if (typeof raw === 'string' && (raw.startsWith('http') || raw.startsWith('data:') || raw.startsWith('blob:'))) {
    return raw;
  }

  // Frontend public assets live in the Vite app root — use as-is
  if (typeof raw === 'string' && raw.startsWith('/images/')) {
    return raw;
  }

  // Everything else is a backend-served path (e.g. /static/uploads/...)
  const API_BASE = deriveApiBase();
  if (typeof raw === 'string') {
    return `${API_BASE}${raw.startsWith('/') ? '' : '/'}${raw}`;
  }

  return fallback;
}

/**
 * Determines the backend API base URL.
 * - If a global window.__INNOVA_API__ is defined, use it.
 * - Otherwise infer from location, defaulting to localhost:5000.
 */
function deriveApiBase() {
  if (typeof window !== 'undefined' && window.__INNOVA_API__) {
    return String(window.__INNOVA_API__).replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined' && window.location && typeof window.location.origin === 'string') {
    // In production the Vite proxy (/api, /static) forwards to Flask,
    // so the relative (same-origin) base is correct.
    return window.location.origin;
  }

  return 'http://localhost:5000';
}

export default resolveImg;

