import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
});

// "Remember me" → token ở localStorage; không tick → sessionStorage (đóng tab là mất).
const readToken = () => {
  try {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
  } catch {
    return null;
  }
};

API.interceptors.request.use((config) => {
  const token = readToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Token hết hạn / bị thu hồi → xóa phiên và về /login. Bỏ qua chính các endpoint đăng nhập.
API.interceptors.response.use(
  (res) => res,
  (error) => {
    const url = error.config?.url || '';
    if (error.response?.status === 401 && readToken() && !url.startsWith('/auth/login')) {
      ['user', 'token'].forEach((k) => {
        try {
          localStorage.removeItem(k);
          sessionStorage.removeItem(k);
        } catch {
          /* bỏ qua */
        }
      });
      if (window.location.pathname !== '/login') window.location.assign('/login');
    }
    return Promise.reject(error);
  }
);

export default API;