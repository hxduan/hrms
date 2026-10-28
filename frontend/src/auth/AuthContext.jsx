import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { xoaPhien } from '../api/client';

const AuthCtx = createContext(null);

/**
 * Giữ thông tin người đăng nhập (từ GET /auth/me) cho toàn ứng dụng.
 *   const { nguoiDung, coVaiTro, luuPhien, dangXuat } = useAuth();
 * nguoiDung: { Id, TenDangNhap, Email, VaiTro, NhanVienId, MaNhanVien, HoTen, CoMatKhau, NhaCungCapOAuth }
 */
export function AuthProvider({ children }) {
  const [nguoiDung, setNguoiDung] = useState(null);
  const [dangTai, setDangTai] = useState(() => !!localStorage.getItem('accessToken'));

  const taiNguoiDung = useCallback(async () => {
    try {
      const r = await api.get('/auth/me');
      setNguoiDung(r.data);
      return r.data;
    } catch (e) {
      if (e.response?.status === 401) xoaPhien();
      setNguoiDung(null);
      return null;
    } finally {
      setDangTai(false);
    }
  }, []);

  useEffect(() => {
    if (localStorage.getItem('accessToken')) taiNguoiDung();
    else setDangTai(false);
  }, [taiNguoiDung]);

  /** Gọi sau khi đăng nhập / đổi mật khẩu thành công: lưu token rồi nạp lại thông tin người dùng. */
  const luuPhien = useCallback(
    async ({ accessToken, refreshToken }) => {
      localStorage.setItem('accessToken', accessToken);
      if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
      return taiNguoiDung();
    },
    [taiNguoiDung]
  );

  const dangXuat = useCallback(async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    try {
      if (refreshToken) await api.post('/auth/dang-xuat', { refreshToken }); // thu hồi token phía server
    } catch {
      /* mất mạng vẫn cho đăng xuất cục bộ */
    }
    xoaPhien();
    setNguoiDung(null);
  }, []);

  const coVaiTro = useCallback((...ds) => !!nguoiDung && ds.includes(nguoiDung.VaiTro), [nguoiDung]);

  const giaTri = useMemo(
    () => ({ nguoiDung, dangTai, luuPhien, dangXuat, taiNguoiDung, coVaiTro }),
    [nguoiDung, dangTai, luuPhien, dangXuat, taiNguoiDung, coVaiTro]
  );
  return <AuthCtx.Provider value={giaTri}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);

export const tenHienThi = (nd) => nd?.HoTen ?? nd?.TenDangNhap ?? 'Tài khoản Google';
