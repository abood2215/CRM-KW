import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('crm_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Temporarily disabled to prevent loops with mock tokens
    /*
    if (error.response?.status === 401) {
      localStorage.removeItem('crm_token');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    */
    return Promise.reject(error);
  }
);

export default api;
