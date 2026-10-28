import { NavLink, Outlet } from 'react-router-dom';
import { TieuDeTrang } from '../../components/ui';

export default function QuanTriLayout() {
  return (
    <>
      <TieuDeTrang tieuDe="Quản trị" moTa="Tài khoản đăng nhập, vai trò và liên kết với hồ sơ nhân viên" />
      <nav className="hr-tab" aria-label="Các mục của Quản trị">
        <NavLink to="tai-khoan">Tài khoản</NavLink>
      </nav>
      <Outlet />
    </>
  );
}
