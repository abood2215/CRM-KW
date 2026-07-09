import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/useAuthStore';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001/api',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  withCredentials: false,
  timeout: 30000,
});

client.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRedirectingToLogin = false;
let rateLimitToastShownAt = 0;

client.interceptors.response.use(
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

    // A burst of failed queries can each hit this — show at most one toast per 10s
    // instead of stacking duplicates, and make clear it's temporary (not a real error).
    if (error.response?.status === 429 && Date.now() - rateLimitToastShownAt > 10000) {
      rateLimitToastShownAt = Date.now();
      toast.error('عدد كبير من الطلبات — انتظر لحظة وحاول مجدداً.');
    }

    return Promise.reject(error);
  }
);

export default client;
