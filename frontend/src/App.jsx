import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DangNhap from './pages/DangNhap/DangNhap';
import OAuthCallback from './pages/DangNhap/OAuthCallback';
import AppLayout from './layouts/AppLayout';

function CanDangNhap({ children }) {
  const daDangNhap = !!localStorage.getItem('accessToken');
  return daDangNhap ? children : <Navigate to="/dang-nhap" />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/dang-nhap" element={<DangNhap />} />
        <Route path="/oauth-callback" element={<OAuthCallback />} />
        <Route
          path="/"
          element={
            <CanDangNhap>
              <AppLayout />
            </CanDangNhap>
          }
        >
          {/* Các route con (to-chuc, nhan-su, cong-luong, quan-tri) thêm
              dần ở Giai đoạn sau — Giai đoạn 1 chỉ cần đăng nhập chạy được */}
          <Route index element={<p>Đăng nhập thành công — nội dung các trang sẽ thêm ở Giai đoạn 2 trở đi.</p>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
