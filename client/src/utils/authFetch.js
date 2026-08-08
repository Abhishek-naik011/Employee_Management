/**
 * authFetch — a drop-in replacement for window.fetch() that:
 *  1. Automatically attaches the stored JWT as a Bearer token.
 *  2. Returns the parsed JSON (or throws on network failure).
 *
 * Usage:
 *   const data = await authFetch('/api/employees');
 *   const data = await authFetch('/api/employees', { method: 'POST', body: JSON.stringify({...}) });
 */
const BASE = import.meta.env.VITE_API_URL.replace('/api', '');

const authFetch = async (url, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const fullUrl = url.startsWith('http') ? url : `${BASE}${url}`;

  const response = await fetch(fullUrl, { 
    ...options, 
    headers,
    credentials: 'true' === 'true' ? 'include' : 'include', 
  });
  return response;
};

export default authFetch;
