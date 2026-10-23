import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DangNhap from './pages/DangNhap/DangNhap';
import QuenMatKhau from './pages/DangNhap/QuenMatKhau';
import DatLaiMatKhau from './pages/DangNhap/DatLaiMatKhau';
import OAuthCallback from './pages/DangNhap/OAuthCallback';
import AppLayout from './layouts/AppLayout';

function CanDangNhap({ children }) {
  const daDangNhap = !!localStorage.getItem('accessToken');
  return daDangNhap ? children : <Navigate to="/dang-nhap" />;
}

/** Trang giữ chỗ cho các module chưa được xây dựng (Giai đoạn 2 trở đi) */
function ChuaXayDung({ tenTrang }) {
  return <p>Trang {tenTrang} sẽ được xây dựng ở giai đoạn sau.</p>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/dang-nhap" element={<DangNhap />} />
        <Route path="/quen-mat-khau" element={<QuenMatKhau />} />
        <Route path="/dat-lai-mat-khau" element={<DatLaiMatKhau />} />
        <Route path="/oauth-callback" element={<OAuthCallback />} />
        <Route
          path="/"
          element={
            <CanDangNhap>
              <AppLayout />
            </CanDangNhap>
          }
        >
          <Route index element={<p>Đăng nhập thành công — nội dung các trang sẽ thêm ở Giai đoạn 2 trở đi.</p>} />
          {/* Route giữ chỗ — tránh bấm menu là ra trang trắng */}
          <Route path="to-chuc" element={<ChuaXayDung tenTrang="Tổ chức" />} />
          <Route path="nhan-su" element={<ChuaXayDung tenTrang="Nhân sự" />} />
          <Route path="cong-luong" element={<ChuaXayDung tenTrang="Công-Lương" />} />
          <Route path="quan-tri" element={<ChuaXayDung tenTrang="Quản trị" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
