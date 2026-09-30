import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:3000' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Tự động làm mới accessToken khi hết hạn (401), thử lại request cũ đúng 1 lần
api.interceptors.response.use(
  (res) => res,
  async (loi) => {
    const requestGoc = loi.config;
    if (loi.response?.status === 401 && !requestGoc._daThuLai) {
      requestGoc._daThuLai = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const res = await axios.post('http://localhost:3000/auth/lam-moi-token', { refreshToken });
        localStorage.setItem('accessToken', res.data.accessToken);
        requestGoc.headers.Authorization = `Bearer ${res.data.accessToken}`;
        return api(requestGoc);
      } catch {
        localStorage.clear();
        window.location.href = '/dang-nhap';
      }
    }
    return Promise.reject(loi);
  }
);

export default api;
