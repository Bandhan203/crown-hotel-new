import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/** Endpoints that must not send or refresh JWT (stale tokens would block login). */
const AUTH_PUBLIC_PATHS = ['/auth/login/', '/auth/register/', '/auth/token/refresh/'];

function isAuthPublicRequest(url?: string): boolean {
  if (!url) return false;
  return AUTH_PUBLIC_PATHS.some((path) => url.includes(path));
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token to every request (except public auth endpoints)
api.interceptors.request.use((config) => {
  if (isAuthPublicRequest(config.url)) {
    delete config.headers.Authorization;
    return config;
  }
  const tokens = localStorage.getItem('tokens');
  if (tokens) {
    const { access } = JSON.parse(tokens);
    if (access) {
      config.headers.Authorization = `Bearer ${access}`;
    }
  }
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (
      error.response?.status === 401 &&
      !original._retry &&
      !isAuthPublicRequest(original.url)
    ) {
      original._retry = true;
      try {
        const tokens = JSON.parse(localStorage.getItem('tokens') || '{}');
        if (!tokens.refresh) {
          throw new Error('No refresh token');
        }
        const res = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
          refresh: tokens.refresh,
        });
        const newTokens = { access: res.data.access, refresh: res.data.refresh ?? tokens.refresh };
        localStorage.setItem('tokens', JSON.stringify(newTokens));
        original.headers.Authorization = `Bearer ${newTokens.access}`;
        return api(original);
      } catch {
        localStorage.removeItem('tokens');
        localStorage.removeItem('user');
        
        // Only force redirect if we are in a protected area
        if (window.location.pathname.startsWith('/admin') && window.location.pathname !== '/admin/login') {
          window.location.href = '/admin/login';
        } else if (window.location.pathname.startsWith('/my-bookings')) {
          window.location.href = '/login';
        }
        
        window.dispatchEvent(new CustomEvent('auth:logout'));
      }
    }
    return Promise.reject(error);
  }
);

export default api;
