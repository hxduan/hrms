import { Link, Navigate, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import AuthShell from '../../components/AuthShell';
import FormPanel from '../../components/FormPanel';
import { ThongBao } from '../../components/ui';
import { truongMatKhauMoi, truongNhapLaiMatKhau } from '../../utils/matKhau';

const CAC_TRUONG = [
  {
    key: 'tenDangNhap',
    nhan: 'Tên đăng nhập',
    batBuoc: true,
    doDaiToiThieu: 3,
    maxLength: 100,
    mau: /^[A-Za-z0-9_.@-]+$/,
    thongBaoMau: 'Chỉ gồm chữ không dấu, số và . _ - @',
    goiY: 'Chữ không dấu, số và . _ - @',
    autoComplete: 'username',
    kiemTraTrung: async (v) => {
      const r = await api.get('/auth/kiem-tra-ten', { params: { tenDangNhap: v } });
      return r.data.daTonTai ? 'Tên đăng nhập đã tồn tại' : null;
    },
  },
  { key: 'email', nhan: 'Email', type: 'email', batBuoc: true, maxLength: 255, autoComplete: 'email', goiY: 'Dùng để nhận mã khi quên mật khẩu' },
  truongMatKhauMoi('Mật khẩu', 'matKhau'),
  truongNhapLaiMatKhau('matKhau'),
];

export default function DangKy() {
  const { nguoiDung, dangTai } = useAuth();
  const dieuHuong = useNavigate();
  if (!dangTai && nguoiDung) return <Navigate to="/" replace />;

  async function dangKy(payload) {
    const r = await api.post('/auth/tu-dang-ky', payload);
    dieuHuong('/dang-nhap', { state: { thongBao: r.data.message } });
  }

  return (
    <AuthShell
      tieuDe="Tạo tài khoản"
      moTa="Dành cho nhân viên chưa có tài khoản"
      duoi={
        <>
          <span>Đã có tài khoản?</span>
          <Link to="/dang-nhap">Đăng nhập</Link>
        </>
      }
    >
      <ThongBao loai="thongTin">
        Sau khi tạo, bộ phận nhân sự cần <b>gắn hồ sơ nhân viên</b> cho tài khoản của bạn thì mới xem được dữ liệu.
      </ThongBao>
      <FormPanel cacTruong={CAC_TRUONG} onSubmit={dangKy} nhanNop="Tạo tài khoản" khoiNop />
    </AuthShell>
  );
}
