import axios from 'axios';
import { storage } from '@/utils/storage';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = storage.getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const activeShopId = storage.getActiveShop();
  if (activeShopId) {
    config.headers['X-Shop-Id'] = activeShopId;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      storage.clearAuthToken();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
