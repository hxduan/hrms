import { useState } from 'react';
import api from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import FormPanel from '../../components/FormPanel';
import { useToast } from '../../components/Feedback';
import { HuyHieu, ThongBao, TieuDeTrang } from '../../components/ui';
import { dinhDangNgay } from '../../utils/chuoi';
import { truongMatKhauMoi, truongNhapLaiMatKhau } from '../../utils/matKhau';
import { MO_TA_VAI_TRO, NHAN_VAI_TRO } from '../../utils/vaiTro';

const TRUONG_DOI_MAT_KHAU = [
  { key: 'matKhauHienTai', nhan: 'Mật khẩu hiện tại', type: 'password', batBuoc: true, autoComplete: 'current-password' },
  truongMatKhauMoi('Mật khẩu mới', 'matKhauMoi'),
  truongNhapLaiMatKhau('matKhauMoi'),
];

const TRUONG_DOI_EMAIL = [
  { key: 'email', nhan: 'Email mới', type: 'email', batBuoc: true, maxLength: 255, autoComplete: 'email' },
  { key: 'matKhauHienTai', nhan: 'Mật khẩu hiện tại', type: 'password', batBuoc: true, autoComplete: 'current-password', goiY: 'Cần xác nhận vì email là nơi nhận mã khôi phục mật khẩu' },
];

export default function TaiKhoanCuaToi() {
  const { nguoiDung, luuPhien, taiNguoiDung } = useAuth();
  const toast = useToast();
  // Tăng số này để làm mới (xóa trắng) form sau khi lưu thành công
  const [lanMatKhau, setLanMatKhau] = useState(0);
  const [lanEmail, setLanEmail] = useState(0);

  async function doiMatKhau(payload) {
    const r = await api.post('/auth/doi-mat-khau', payload);
    // Server thu hồi mọi phiên cũ và cấp token mới cho phiên hiện tại
    await luuPhien({ accessToken: r.data.accessToken, refreshToken: r.data.refreshToken });
    toast.thanhCong('Đã đổi mật khẩu. Các thiết bị khác sẽ phải đăng nhập lại.');
    setLanMatKhau((n) => n + 1);
  }

  async function doiEmail(payload) {
    await api.put('/auth/me/email', payload);
    await taiNguoiDung();
    toast.thanhCong('Đã cập nhật email');
    setLanEmail((n) => n + 1);
  }

  const dangNhapBang = [nguoiDung.CoMatKhau && 'Mật khẩu', nguoiDung.NhaCungCapOAuth && 'Google'].filter(Boolean).join(' + ');

  return (
    <>
      <TieuDeTrang tieuDe="Tài khoản của tôi" moTa="Thông tin đăng nhập, vai trò và bảo mật" />

      <div className="hr-the hr-the-than" style={{ marginBottom: 16 }}>
        <dl className="hr-danh-sach-info">
          <dt>Tên đăng nhập</dt>
          <dd>{nguoiDung.TenDangNhap ?? <span className="hr-goi-y">(không có — đăng nhập bằng Google)</span>}</dd>
          <dt>Email</dt>
          <dd>{nguoiDung.Email ?? <span className="hr-goi-y">Chưa có</span>}</dd>
          <dt>Vai trò</dt>
          <dd>
            <HuyHieu loai={nguoiDung.VaiTro}>{NHAN_VAI_TRO[nguoiDung.VaiTro]}</HuyHieu>
            <div className="hr-goi-y" style={{ marginTop: 4 }}>
              {MO_TA_VAI_TRO[nguoiDung.VaiTro]}
            </div>
          </dd>
          <dt>Đăng nhập bằng</dt>
          <dd>{dangNhapBang || '—'}</dd>
          <dt>Hồ sơ nhân viên</dt>
          <dd>
            {nguoiDung.NhanVienId ? (
              <>
                <strong>{nguoiDung.MaNhanVien}</strong> — {nguoiDung.HoTen}
              </>
            ) : (
              <HuyHieu loai="vang">Chưa gắn hồ sơ</HuyHieu>
            )}
          </dd>
          <dt>Ngày tạo tài khoản</dt>
          <dd>{dinhDangNgay(nguoiDung.NgayTao)}</dd>
        </dl>
      </div>

      {nguoiDung.CoMatKhau ? (
        <div className="hr-luoi-the" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', alignItems: 'start' }}>
          <div className="hr-the hr-the-than">
            <h3 style={{ marginBottom: 14 }}>Đổi mật khẩu</h3>
            <FormPanel key={lanMatKhau} cacTruong={TRUONG_DOI_MAT_KHAU} onSubmit={doiMatKhau} nhanNop="Đổi mật khẩu" />
          </div>
          <div className="hr-the hr-the-than">
            <h3 style={{ marginBottom: 14 }}>Đổi email</h3>
            <FormPanel key={lanEmail} cacTruong={TRUONG_DOI_EMAIL} onSubmit={doiEmail} nhanNop="Cập nhật email" />
          </div>
        </div>
      ) : (
        <ThongBao loai="thongTin">
          Tài khoản này đăng nhập bằng Google nên mật khẩu và email được quản lý tại tài khoản Google của bạn.
        </ThongBao>
      )}
    </>
  );
}
