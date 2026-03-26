import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: false,
  timeout: 30000, // 30s timeout to prevent hanging requests
});

// Attach Bearer token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('crm_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Track if we're already redirecting to avoid infinite loops
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
      localStorage.removeItem('crm_token');
      localStorage.removeItem('crm_user');

      // Small delay so pending toasts can display
      setTimeout(() => {
        window.location.href = '/login';
        isRedirectingToLogin = false;
      }, 200);
    }

    return Promise.reject(error);
  }
);

export default api;
