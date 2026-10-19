import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';

export default function DangNhap() {
  const [tenDangNhap, setTenDangNhap] = useState('');
  const [matKhau, setMatKhau] = useState('');
  const [loi, setLoi] = useState('');
  const dieuHuong = useNavigate();

  async function handleDangNhap(e) {
    e.preventDefault();
    setLoi('');
    try {
      const res = await api.post('/auth/login', { tenDangNhap, matKhau });
      localStorage.setItem('accessToken', res.data.accessToken);
      localStorage.setItem('refreshToken', res.data.refreshToken);
      dieuHuong('/');
    } catch (err) {
      setLoi(err.response?.data?.message ?? 'Đăng nhập thất bại');
    }
  }

  return (
    <main className="trang-dang-nhap">
      <h1>Đăng nhập HRMS</h1>
      <p className="mo-ta-dang-nhap">Đăng nhập để truy cập hệ thống nhân sự.</p>
      <form onSubmit={handleDangNhap}>
        <div className="nhom-truong">
          <label htmlFor="tenDangNhap">Tên đăng nhập</label>
          <input
            id="tenDangNhap"
            name="tenDangNhap"
            autoComplete="username"
            required
            value={tenDangNhap}
            onChange={(e) => setTenDangNhap(e.target.value)}
          />
        </div>
        <div className="nhom-truong">
          <label htmlFor="matKhau">Mật khẩu</label>
          <input
            id="matKhau"
            name="matKhau"
            type="password"
            autoComplete="current-password"
            required
            value={matKhau}
            onChange={(e) => setMatKhau(e.target.value)}
          />
        </div>
        {loi && <p className="loi-dang-nhap" role="alert">{loi}</p>}
        <button className="nut-dang-nhap" type="submit">Đăng nhập</button>
      </form>
      <div className="phan-cach">hoặc</div>
      <a className="nut-google" href="http://localhost:3000/auth/google">
        Đăng nhập với Google
      </a>
    </main>
  );
}
