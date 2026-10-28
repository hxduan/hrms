import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api/client';
import AuthShell from '../../components/AuthShell';
import FormPanel from '../../components/FormPanel';
import { ThongBao } from '../../components/ui';
import { truongMatKhauMoi, truongNhapLaiMatKhau } from '../../utils/matKhau';

const CAC_TRUONG = [truongMatKhauMoi('Mật khẩu mới', 'matKhauMoi'), truongNhapLaiMatKhau('matKhauMoi')];

/** Trang đích của liên kết trong email: /dat-lai-mat-khau?ma=... */
export default function DatLaiMatKhau() {
  const [params] = useSearchParams();
  const ma = params.get('ma');
  const dieuHuong = useNavigate();

  async function datLai(payload) {
    const r = await api.post('/auth/dat-lai-mat-khau', { ma, matKhauMoi: payload.matKhauMoi });
    dieuHuong('/dang-nhap', { state: { thongBao: r.data.message + '. Hãy đăng nhập bằng mật khẩu mới.' } });
  }

  return (
    <AuthShell tieuDe="Đặt lại mật khẩu" duoi={<Link to="/dang-nhap">← Quay lại đăng nhập</Link>}>
      {!ma ? (
        <ThongBao loai="loi">
          Liên kết không hợp lệ hoặc đã hết hạn. Vui lòng liên hệ bộ phận Nhân sự để nhận liên kết mới.
        </ThongBao>
      ) : (
        <FormPanel cacTruong={CAC_TRUONG} onSubmit={datLai} nhanNop="Đặt lại mật khẩu" khoiNop />
      )}
    </AuthShell>
  );
}
