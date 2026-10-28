import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { ManHinhTai, ThongBao } from '../components/ui';
import { NHAN_VAI_TRO } from '../utils/vaiTro';

/**
 * Bọc route cần đăng nhập. Truyền vaiTro={['admin','hr']} để giới hạn theo vai trò.
 * Đây chỉ là lớp giao diện — backend luôn kiểm tra lại quyền ở từng API.
 */
export default function RequireAuth({ children, vaiTro }) {
  const { nguoiDung, dangTai } = useAuth();
  const viTri = useLocation();

  if (dangTai) return <ManHinhTai />;
  if (!nguoiDung) return <Navigate to="/dang-nhap" replace state={{ tu: viTri }} />;

  if (vaiTro && !vaiTro.includes(nguoiDung.VaiTro)) {
    return (
      <div>
        <ThongBao loai="vang">
          <strong>Bạn không có quyền truy cập trang này.</strong>
          <div>
            Vai trò hiện tại của bạn là <b>{NHAN_VAI_TRO[nguoiDung.VaiTro]}</b>. Trang này dành cho:{' '}
            {vaiTro.map((v) => NHAN_VAI_TRO[v]).join(', ')}.
          </div>
        </ThongBao>
      </div>
    );
  }
  return children;
}
