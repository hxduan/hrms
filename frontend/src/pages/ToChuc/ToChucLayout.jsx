import { NavLink, Outlet } from 'react-router-dom';
import { TieuDeTrang } from '../../components/ui';

export default function ToChucLayout() {
  return (
    <>
      <TieuDeTrang tieuDe="Tổ chức" moTa="Sơ đồ phòng ban, chức vụ, chức danh và định biên nhân sự" />
      <nav className="hr-tab" aria-label="Các mục của Tổ chức">
        <NavLink to="phong-ban">Phòng ban</NavLink>
        <NavLink to="chuc-vu">Chức vụ</NavLink>
        <NavLink to="chuc-danh">Chức danh</NavLink>
        <NavLink to="dinh-bien">Định biên</NavLink>
      </nav>
      <Outlet />
    </>
  );
}
