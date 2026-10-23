import axios from 'axios';

// URL tương đối: dev nhờ vite proxy (xem vite.config.js), production thì
// backend tự phục vụ dist — không hardcode http://localhost:3000 nữa.
const api = axios.create({ baseURL: '/' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Các endpoint auth không được xử lý bởi cơ chế tự làm mới token —
// nếu không, đăng nhập sai mật khẩu (401) sẽ bị coi là "token hết hạn"
// và người dùng bị đá ra màn hình đăng nhập, không thấy thông báo lỗi.
const ENDPOINT_KHONG_TU_LAM_MOI = [
  '/auth/login',
  '/auth/lam-moi-token',
  '/auth/quen-mat-khau',
  '/auth/dat-lai-mat-khau',
  '/auth/dang-ky',
];

// Tự động làm mới accessToken khi hết hạn (401), thử lại request cũ đúng 1 lần
api.interceptors.response.use(
  (res) => res,
  async (loi) => {
    const requestGoc = loi.config;
    const laEndpointAuth = ENDPOINT_KHONG_TU_LAM_MOI.some((e) =>
      requestGoc?.url?.includes(e),
    );

    if (loi.response?.status === 401 && requestGoc && !laEndpointAuth && !requestGoc._daThuLai) {
      requestGoc._daThuLai = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const res = await axios.post('/auth/lam-moi-token', { refreshToken });
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
