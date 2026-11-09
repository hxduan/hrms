import { Link } from 'react-router-dom';
import { tenHienThi, useAuth } from '../auth/AuthContext';
import Icon from '../components/Icon';
import { HuyHieu, TieuDeTrang } from '../components/ui';
import { menuCuaVaiTro, MO_TA_VAI_TRO, NHAN_VAI_TRO } from '../utils/vaiTro';

const MO_TA_MENU = {
  '/to-chuc': 'Sơ đồ phòng ban, chức vụ, chức danh, định biên nhân sự',
  '/nhan-su': 'Hồ sơ nhân viên, hợp đồng, quá trình công tác, phụ cấp và nghỉ việc',
  '/ho-so-cua-toi': 'Thông tin cá nhân, hợp đồng và quá trình công tác của bạn',
  '/cham-cong': 'Ca làm việc, dữ liệu chấm công, bảng công, kỳ công',
  '/cham-cong/cua-toi': 'Bảng công của bạn theo tháng',
  '/don-tu': 'Đơn nghỉ phép, làm thêm giờ, công tác',
  '/bao-hiem-thue': 'Tham số pháp luật, biến động bảo hiểm và báo cáo',
  '/luong': 'Kỳ lương, bảng lương, duyệt và điều chỉnh',
  '/phieu-luong': 'Phiếu lương của bạn',
  '/bao-cao': 'Báo cáo và biểu đồ nhân sự',
  '/quan-tri': 'Tài khoản, vai trò và danh mục',
};

export default function TrangChu() {
  const { nguoiDung } = useAuth();
  const menu = menuCuaVaiTro(nguoiDung.VaiTro);

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
