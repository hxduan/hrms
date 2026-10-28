import { Link } from 'react-router-dom';
import { tenHienThi, useAuth } from '../auth/AuthContext';
import Icon from '../components/Icon';
import { HuyHieu, TieuDeTrang } from '../components/ui';
import { MENU, MO_TA_VAI_TRO, NHAN_VAI_TRO } from '../utils/vaiTro';

const MO_TA_MENU = {
  '/to-chuc': 'Sơ đồ phòng ban, chức vụ, chức danh, định biên nhân sự',
  '/nhan-su': 'Hồ sơ, hợp đồng, quá trình làm việc (Giai đoạn 3–4)',
  '/ho-so-cua-toi': 'Thông tin cá nhân và hợp đồng của bạn (Giai đoạn 3–4)',
  '/cong-luong': 'Chấm công, đơn từ, bảng lương (Giai đoạn 5–9)',
  '/quan-tri': 'Tài khoản, vai trò, gắn hồ sơ nhân viên',
};

export default function TrangChu() {
  const { nguoiDung } = useAuth();
  const menu = MENU.filter((m) => m.vaiTro.includes(nguoiDung.VaiTro));

  return (
    <>
      <TieuDeTrang tieuDe={`Xin chào, ${tenHienThi(nguoiDung)}`} moTa={MO_TA_VAI_TRO[nguoiDung.VaiTro]}>
        <HuyHieu loai={nguoiDung.VaiTro}>{NHAN_VAI_TRO[nguoiDung.VaiTro]}</HuyHieu>
      </TieuDeTrang>
      <div className="hr-luoi-the" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
        {menu.map((m) => (
          <Link key={m.to} to={m.to} className="hr-the hr-the-than" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600, marginBottom: 6 }}>
              <Icon ten={m.icon} /> {m.nhan}
            </div>
            <div className="hr-goi-y">{MO_TA_MENU[m.to]}</div>
          </Link>
        ))}
      </div>
    </>
  );
}
