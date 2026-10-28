import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { tenHienThi, useAuth } from '../auth/AuthContext';
import Icon from '../components/Icon';
import { HuyHieu, ThongBao } from '../components/ui';
import { layChuCaiDau, MENU, NHAN_VAI_TRO } from '../utils/vaiTro';

/** Khung chính sau khi đăng nhập: thanh bên (menu theo vai trò), thanh trên (người dùng), nội dung. */
export default function AppLayout() {
  const { nguoiDung, dangXuat } = useAuth();
  const viTri = useLocation();
  const dieuHuong = useNavigate();
  const [moNgan, setMoNgan] = useState(false);
  const [moMenuNguoiDung, setMoMenuNguoiDung] = useState(false);
  const vungNguoiDung = useRef(null);

  const menu = MENU.filter((m) => m.vaiTro.includes(nguoiDung.VaiTro));
  const ten = tenHienThi(nguoiDung);

  // Chuyển trang thì đóng ngăn kéo (di động) và menu người dùng
  useEffect(() => {
    setMoNgan(false);
    setMoMenuNguoiDung(false);
  }, [viTri.pathname]);

  useEffect(() => {
    if (!moMenuNguoiDung) return undefined;
    const khiBamNgoai = (e) => !vungNguoiDung.current?.contains(e.target) && setMoMenuNguoiDung(false);
    const khiBamPhim = (e) => e.key === 'Escape' && setMoMenuNguoiDung(false);
    document.addEventListener('mousedown', khiBamNgoai);
    document.addEventListener('keydown', khiBamPhim);
    return () => {
      document.removeEventListener('mousedown', khiBamNgoai);
      document.removeEventListener('keydown', khiBamPhim);
    };
  }, [moMenuNguoiDung]);

  async function thoat() {
    await dangXuat();
    dieuHuong('/dang-nhap', { replace: true });
  }

  const chuaGanHoSo = nguoiDung.VaiTro === 'nhan_vien' && !nguoiDung.NhanVienId;

  return (
    <div className="hr-app">
      <div className="hr-khung">
        <aside className={`hr-thanh-ben ${moNgan ? 'mo' : ''}`} aria-label="Điều hướng chính">
          <div className="hr-logo">
            <span className="hr-logo-o">H</span> HRMS
          </div>
          <nav className="hr-menu">
            {menu.map((m) => (
              <NavLink key={m.to} to={m.to}>
                <Icon ten={m.icon} kichCo={18} /> {m.nhan}
              </NavLink>
            ))}
          </nav>
        </aside>
        <div className={`hr-nen-mo ${moNgan ? 'mo' : ''}`} onClick={() => setMoNgan(false)} />

        <div className="hr-noi-dung">
          <header className="hr-thanh-tren">
            <button type="button" className="hr-btn hr-btn-icon hr-nut-menu" onClick={() => setMoNgan(true)} aria-label="Mở menu">
              <Icon ten="menu" />
            </button>
            <span className="hr-gian" />

            <div className="hr-nguoi-dung" ref={vungNguoiDung}>
              <button
                type="button"
                className="hr-nguoi-dung-nut"
                onClick={() => setMoMenuNguoiDung((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={moMenuNguoiDung}
              >
                <span className="hr-avatar">{layChuCaiDau(ten)}</span>
                <span className="hr-nguoi-dung-ten">
                  {ten}
                  <small>{NHAN_VAI_TRO[nguoiDung.VaiTro]}</small>
                </span>
                <Icon ten="xuongMuiTen" kichCo={15} />
              </button>
              {moMenuNguoiDung && (
                <div className="hr-menu-tha" role="menu">
                  <div style={{ padding: '8px 10px 10px' }}>
                    <div style={{ fontWeight: 600 }}>{ten}</div>
                    {nguoiDung.Email && <div className="hr-goi-y">{nguoiDung.Email}</div>}
                    <div style={{ marginTop: 6 }}>
                      <HuyHieu loai={nguoiDung.VaiTro}>{NHAN_VAI_TRO[nguoiDung.VaiTro]}</HuyHieu>
                    </div>
                  </div>
                  <div className="hr-phan-cach" />
                  <Link to="/tai-khoan-cua-toi" role="menuitem">
                    <Icon ten="chia" kichCo={16} /> Tài khoản &amp; đổi mật khẩu
                  </Link>
                  <button type="button" role="menuitem" onClick={thoat}>
                    <Icon ten="dangXuat" kichCo={16} /> Đăng xuất
                  </button>
                </div>
              )}
            </div>
          </header>

          <main className="hr-trang">
            {chuaGanHoSo && (
              <ThongBao loai="vang">
                <strong>Tài khoản của bạn chưa được gắn hồ sơ nhân viên.</strong> Bạn chưa xem được dữ liệu cho tới khi bộ phận
                nhân sự gắn hồ sơ (Quản trị → Tài khoản). Vui lòng liên hệ HR.
              </ThongBao>
            )}
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
