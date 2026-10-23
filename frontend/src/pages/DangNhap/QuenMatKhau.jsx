import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';

export default function QuenMatKhau() {
  const [email, setEmail] = useState('');
  const [thongBao, setThongBao] = useState('');
  const [loi, setLoi] = useState('');
  const [dangGui, setDangGui] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setThongBao('');
    setLoi('');
    setDangGui(true);
    try {
      const res = await api.post('/auth/quen-mat-khau', { email });
      setThongBao(res.data.message);
    } catch (err) {
      setLoi(err.response?.data?.message ?? 'Không thể gửi yêu cầu. Vui lòng thử lại.');
    } finally {
      setDangGui(false);
    }
  }

  return (
    <main className="trang-dang-nhap">
      <h1>Quên mật khẩu</h1>
      <p className="mo-ta-dang-nhap">
        Nhập email đã đăng ký. Nếu tài khoản tồn tại, chúng tôi sẽ gửi liên kết
        đặt lại mật khẩu.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="nhom-truong">
          <label htmlFor="emailKhoiPhuc">Email</label>
          <input
            id="emailKhoiPhuc"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        {loi && <p className="loi-dang-nhap" role="alert">{loi}</p>}
        {thongBao && <p className="thong-bao" role="status">{thongBao}</p>}
        <button className="nut-dang-nhap" type="submit" disabled={dangGui}>
          {dangGui ? 'Đang gửi...' : 'Gửi liên kết khôi phục'}
        </button>
      </form>
      <p className="lien-ket-dang-nhap"><Link to="/dang-nhap">Quay lại đăng nhập</Link></p>
    </main>
  );
}
