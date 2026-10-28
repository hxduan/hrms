import axios from 'axios';

// Dùng URL tương đối để chạy cùng origin ở production; dev được Vite proxy tới backend.
const GOC_API = import.meta.env?.VITE_API_URL ?? '';
const api = axios.create({ baseURL: GOC_API });
export { GOC_API };

// Các API này tự trả 401 theo nghiệp vụ (sai mật khẩu, mã hết hạn...) — KHÔNG được
// coi là "access token hết hạn" để đi làm mới token rồi chuyển về trang đăng nhập.
// (Bản Giai đoạn 1 thiếu bước này nên sai mật khẩu bị đá thẳng về trang đăng nhập,
//  thông báo lỗi không kịp hiện ra.)
const KHONG_LAM_MOI = [
  '/auth/login',
  '/auth/lam-moi-token',
  '/auth/tu-dang-ky',
  '/auth/quen-mat-khau',
  '/auth/dat-lai-mat-khau',
  '/auth/dang-xuat',
];

let dangLamMoi = null; // dùng chung 1 lời gọi làm mới khi nhiều request cùng hết hạn một lúc

export function xoaPhien() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

function veTrangDangNhap() {
  xoaPhien();
  if (!window.location.pathname.startsWith('/dang-nhap')) window.location.assign('/dang-nhap');
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (loi) => {
    const goc = loi.config;
    const url = goc?.url ?? '';
    const canLamMoi = loi.response?.status === 401 && goc && !goc._daThuLai && !KHONG_LAM_MOI.some((p) => url.startsWith(p));
    if (!canLamMoi) return Promise.reject(loi);

    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      veTrangDangNhap();
      return Promise.reject(loi);
    }

    goc._daThuLai = true;
    try {
      dangLamMoi ??= axios
        .post(`${GOC_API}/auth/lam-moi-token`, { refreshToken })
        .then((r) => r.data.accessToken)
        .finally(() => {
          dangLamMoi = null;
        });
      const accessToken = await dangLamMoi;
      localStorage.setItem('accessToken', accessToken);
      goc.headers.Authorization = `Bearer ${accessToken}`;
      return api(goc);
    } catch {
      veTrangDangNhap();
      return Promise.reject(loi);
    }
  }
);

export default api;
