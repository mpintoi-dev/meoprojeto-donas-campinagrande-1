import axios from 'axios';

const BACKEND = process.env.REACT_APP_BACKEND_URL || '';
const api = axios.create({ baseURL: `${BACKEND}/api` });

api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem('donas_admin_token');
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem('donas_admin_token');
      if (!window.location.pathname.endsWith('/login')) {
        window.location.href = '/donaspainel/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
