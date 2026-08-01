import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Interceptor to inject Authorization header and X-Shop-Id
api.interceptors.request.use((config) => {
  const authSession = localStorage.getItem('raju_billing_auth_session');
  if (authSession) {
    try {
      const parsed = JSON.parse(authSession);
      if (parsed.accessToken) {
        config.headers.Authorization = `Bearer ${parsed.accessToken}`;
      }
    } catch (e) {
      console.error('Failed to parse auth session', e);
    }
  }

  const activeShop = localStorage.getItem('raju_billing_active_shop');
  if (activeShop) {
    config.headers['X-Shop-Id'] = activeShop;
  }

  return config;
});

// Interceptor to handle 401 Unauthorized responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('raju_billing_auth_session');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
