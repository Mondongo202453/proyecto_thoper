import axios from 'axios';

export const BACKEND_HOST = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';
const BASE_URL = import.meta.env.VITE_API_URL || `${BACKEND_HOST}/api`;

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const setTokens = (access: string | null, refresh: string | null = null) => {
  if (access && access !== 'null') localStorage.setItem('access_token', access);
  else localStorage.removeItem('access_token');
  if (refresh && refresh !== 'null') localStorage.setItem('refresh_token', refresh);
  else if (refresh === null) {
    // do nothing (keep existing) - caller decides; but default clear if null explicit
  } else {
    localStorage.removeItem('refresh_token');
  }
};

const clearTokens = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
};

// Interceptor para añadir el token JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  // Only attach Authorization header when token is a non-empty, non-null string
  if (token && token !== 'null' && token.trim().length > 0) {
    config.headers = {
      ...config.headers,
      Authorization: 'Bearer ' + token,
    };
  }
  return config;
});

// Response interceptor: on 401 try refresh token once, then retry original request
let isRefreshing = false;
let failedQueue: Array<{resolve: (value?: any) => void, reject: (reason?: any) => void, config: any}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) prom.reject(error);
    else {
      if (token) prom.config.headers['Authorization'] = 'Bearer ' + token;
      prom.resolve(axios(prom.config));
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest) return Promise.reject(error);

    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken || refreshToken === 'null') {
        clearTokens();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // queue the request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject, config: originalRequest });
        });
      }

      isRefreshing = true;
      const sessionRefreshToken = refreshToken;
      try {
        const resp = await axios.post(`${BACKEND_HOST}/api/token/refresh/`, { refresh: refreshToken });
        if (localStorage.getItem('refresh_token') !== sessionRefreshToken) {
          throw new Error('La sesión cambió mientras se renovaba el token.');
        }

        const newAccess = resp.data.access || resp.data.token || resp.data.access_token;
        const newRefresh = resp.data.refresh;
        if (typeof newAccess === 'string' && typeof newRefresh === 'string') {
          setTokens(newAccess, newRefresh);
          originalRequest.headers['Authorization'] = 'Bearer ' + newAccess;
          processQueue(null, newAccess);
          return axios(originalRequest);
        }
        throw new Error('La respuesta de renovación no contiene los tokens esperados.');
      } catch (refreshError) {
        const sameSession = localStorage.getItem('refresh_token') === sessionRefreshToken;
        if (sameSession) {
          clearTokens();
          localStorage.removeItem('user');
          window.dispatchEvent(new Event('auth-session-updated'));
        }
        processQueue(refreshError, null);
        if (sameSession && typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
