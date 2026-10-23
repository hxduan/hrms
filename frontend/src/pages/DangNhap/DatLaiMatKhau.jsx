import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../api/client';

export default function DatLaiMatKhau() {
  const [params] = useSearchParams();
  const ma = params.get('ma') || '';
  const [matKhauMoi, setMatKhauMoi] = useState('');
  const [xacNhanMatKhau, setXacNhanMatKhau] = useState('');
  const [thongBao, setThongBao] = useState('');
  const [loi, setLoi] = useState('');
  const [dangGui, setDangGui] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setThongBao('');
    setLoi('');
    if (!ma) {
      setLoi('Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.');
      return;
    }
    if (matKhauMoi !== xacNhanMatKhau) {
      setLoi('Mật khẩu xác nhận không khớp.');
      return;
    }

    setDangGui(true);
    try {
      const res = await api.post('/auth/dat-lai-mat-khau', { ma, matKhauMoi });
      setThongBao(res.data.message);
    } catch (err) {
      setLoi(err.response?.data?.message ?? 'Không thể đặt lại mật khẩu. Vui lòng thử lại.');
    } finally {
      setDangGui(false);
    }
  }

  return (
    <main className="trang-dang-nhap">
      <h1>Đặt lại mật khẩu</h1>
      <p className="mo-ta-dang-nhap">Tạo mật khẩu mới có ít nhất 6 ký tự.</p>
      <form onSubmit={handleSubmit}>
        <div className="nhom-truong">
          <label htmlFor="matKhauMoi">Mật khẩu mới</label>
          <input
            id="matKhauMoi"
            name="matKhauMoi"
            type="password"
            autoComplete="new-password"
            minLength={6}
            required
            value={matKhauMoi}
            onChange={(e) => setMatKhauMoi(e.target.value)}
          />
        </div>
        <div className="nhom-truong">
          <label htmlFor="xacNhanMatKhau">Xác nhận mật khẩu</label>
          <input
            id="xacNhanMatKhau"
            name="xacNhanMatKhau"
            type="password"
            autoComplete="new-password"
            minLength={6}
            required
            value={xacNhanMatKhau}
            onChange={(e) => setXacNhanMatKhau(e.target.value)}
          />
        </div>
        {loi && <p className="loi-dang-nhap" role="alert">{loi}</p>}
        {thongBao ? (
          <p className="thong-bao" role="status">
            {thongBao} <Link to="/dang-nhap">Đăng nhập</Link>
          </p>
        ) : (
          <button className="nut-dang-nhap" type="submit" disabled={dangGui}>
            {dangGui ? 'Đang lưu...' : 'Lưu mật khẩu mới'}
          </button>
        )}
      </form>
      {!thongBao && (
        <p className="lien-ket-dang-nhap"><Link to="/dang-nhap">Quay lại đăng nhập</Link></p>
      )}
    </main>
  );
}
