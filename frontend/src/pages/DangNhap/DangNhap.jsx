import { useState } from 'react';
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
    <div className="trang-dang-nhap" style={{ maxWidth: 360, margin: '80px auto' }}>
      <h2>Đăng nhập HRMS</h2>
      <form onSubmit={handleDangNhap}>
        <div style={{ marginBottom: 12 }}>
          <label>Tên đăng nhập</label>
          <input value={tenDangNhap} onChange={(e) => setTenDangNhap(e.target.value)} style={{ width: '100%' }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Mật khẩu</label>
          <input
            type="password"
            value={matKhau}
            onChange={(e) => setMatKhau(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>
        {loi && <p style={{ color: 'red' }}>{loi}</p>}
        <button type="submit" style={{ width: '100%' }}>
          Đăng nhập
        </button>
      </form>
      <div style={{ margin: '16px 0', textAlign: 'center', color: '#888' }}>hoặc</div>
      <a href="http://localhost:3000/auth/google" style={{ display: 'block', textAlign: 'center' }}>
        <button style={{ width: '100%' }}>Đăng nhập với Google</button>
      </a>
    </div>
  );
}
