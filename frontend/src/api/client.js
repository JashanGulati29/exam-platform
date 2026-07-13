import axios from 'axios';

// In development, Vite proxies /api → localhost:5000, so a relative URL works
// without CORS issues. The env var overrides this for staging/production builds.
const BASE_URL = 'https://exam-platform-backend-7714.onrender.com/api';

const api = axios.create({
  baseURL: BASE_URL,
});


api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Transparently refreshes the access token once on a 401 and retries the
// original request, so short-lived (30 min) access tokens don't force
// students mid-exam to log back in.
let isRefreshing = false;
let pendingQueue = [];

function resolvePending(token) {
  pendingQueue.forEach((cb) => cb(token));
  pendingQueue = [];
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return Promise.reject(error);

    originalRequest._retry = true;

    if (isRefreshing) {
      return new Promise((resolve) => {
        pendingQueue.push((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          resolve(api(originalRequest));
        });
      });
    }

    isRefreshing = true;
    try {
      const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
      localStorage.setItem('accessToken', data.accessToken);
      resolvePending(data.accessToken);
      originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
