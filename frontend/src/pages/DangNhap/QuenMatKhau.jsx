import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import AuthShell from '../../components/AuthShell';
import FormPanel from '../../components/FormPanel';
import { ThongBao } from '../../components/ui';

const CAC_TRUONG = [
  {
    key: 'dinhDanh',
    nhan: 'Tên đăng nhập hoặc email',
    batBuoc: true,
    maxLength: 255,
    autoComplete: 'username',
    goiY: 'Chúng tôi sẽ gửi liên kết đặt lại mật khẩu tới email đã đăng ký cho tài khoản',
  },
];

export default function QuenMatKhau() {
  const [daGui, setDaGui] = useState(null);

  async function gui(payload) {
    const r = await api.post('/auth/quen-mat-khau', payload);
    setDaGui(r.data.message);
  }

  return (
    <AuthShell tieuDe="Quên mật khẩu" duoi={<Link to="/dang-nhap">← Quay lại đăng nhập</Link>}>
      {daGui ? (
        <>
          <ThongBao loai="ok">{daGui}</ThongBao>
          <p style={{ color: 'var(--chu-phu)', margin: 0 }}>
            Liên kết có hiệu lực <b>30 phút</b>. Nếu không thấy email, hãy kiểm tra thư mục Spam. Tài khoản đăng nhập bằng
            Google không có mật khẩu để khôi phục.
          </p>
        </>
      ) : (
        <FormPanel cacTruong={CAC_TRUONG} onSubmit={gui} nhanNop="Gửi liên kết khôi phục" khoiNop />
      )}
    </AuthShell>
  );
}
