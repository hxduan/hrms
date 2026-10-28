import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import RequireAuth from './auth/RequireAuth';
import { FeedbackProvider } from './components/Feedback';
import AppLayout from './layouts/AppLayout';
import DangNhap from './pages/DangNhap/DangNhap';
import DatLaiMatKhau from './pages/DangNhap/DatLaiMatKhau';
import OAuthCallback from './pages/DangNhap/OAuthCallback';
import QuanTriLayout from './pages/QuanTri/QuanTriLayout';
import QuanTriTaiKhoan from './pages/QuanTri/TaiKhoan';
import SapCo, { KhongTimThay } from './pages/SapCo';
import TaiKhoanCuaToi from './pages/TaiKhoan/TaiKhoanCuaToi';
import ChucDanh from './pages/ToChuc/ChucDanh';
import ChucVu from './pages/ToChuc/ChucVu';
import DinhBien from './pages/ToChuc/DinhBien';
import PhongBan from './pages/ToChuc/PhongBan';
import ToChucLayout from './pages/ToChuc/ToChucLayout';
import TrangChu from './pages/TrangChu';

const QUAN_LY = ['admin', 'hr'];

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <FeedbackProvider>
          <Routes>
            {/* Công khai — chỉ còn: đăng nhập, đặt lại mật khẩu bằng liên kết email, callback Google.
                KHÔNG còn tự đăng ký / quên mật khẩu: tài khoản do admin/HR cấp. */}
            <Route path="/dang-nhap" element={<DangNhap />} />
            <Route path="/dat-lai-mat-khau" element={<DatLaiMatKhau />} />
            <Route path="/oauth-callback" element={<OAuthCallback />} />

            {/* Cần đăng nhập — AppLayout dựng menu theo vai trò */}
            <Route
              path="/"
              element={
                <RequireAuth>
                  <AppLayout />
                </RequireAuth>
              }
            >
              <Route index element={<TrangChu />} />

              <Route path="to-chuc" element={<ToChucLayout />}>
                <Route index element={<Navigate to="phong-ban" replace />} />
                <Route path="phong-ban" element={<PhongBan />} />
                <Route path="chuc-vu" element={<ChucVu />} />
                <Route path="chuc-danh" element={<ChucDanh />} />
                <Route path="dinh-bien" element={<DinhBien />} />
              </Route>

              <Route path="nhan-su/*" element={<RequireAuth vaiTro={QUAN_LY}><SapCo ten="Nhân sự" giaiDoan="3 và 4" /></RequireAuth>} />
              <Route path="ho-so-cua-toi" element={<RequireAuth vaiTro={['nhan_vien']}><SapCo ten="Hồ sơ của tôi" giaiDoan="3 và 4" /></RequireAuth>} />
              <Route path="cong-luong/*" element={<SapCo ten="Công - Lương" giaiDoan="5 đến 9" />} />

              <Route path="quan-tri" element={<RequireAuth vaiTro={QUAN_LY}><QuanTriLayout /></RequireAuth>}>
                <Route index element={<Navigate to="tai-khoan" replace />} />
                <Route path="tai-khoan" element={<QuanTriTaiKhoan />} />
              </Route>

              <Route path="tai-khoan-cua-toi" element={<TaiKhoanCuaToi />} />
              <Route path="*" element={<KhongTimThay />} />
            </Route>
          </Routes>
        </FeedbackProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
