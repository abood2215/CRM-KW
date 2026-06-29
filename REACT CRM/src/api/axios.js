import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: false,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRedirectingToLogin = false;

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      !isRedirectingToLogin &&
      !window.location.pathname.includes('/login')
    ) {
      isRedirectingToLogin = true;
      useAuthStore.getState().logout();

      setTimeout(() => {
        isRedirectingToLogin = false;
        window.location.href = '/login';
      }, 200);
    }

    return Promise.reject(error);
  }
);

export default api;
