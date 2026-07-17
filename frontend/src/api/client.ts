import axios from 'axios';

export const BACKEND_HOST = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8001';
const BASE_URL = import.meta.env.VITE_API_URL || `${BACKEND_HOST}/api`;

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para añadir el token JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: 'Bearer ' + token,
    };
  }
  return config;
});

export default api;
