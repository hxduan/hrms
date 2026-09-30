import { Outlet, Link, useNavigate } from 'react-router-dom';

const MENU = [
  { path: '/to-chuc', label: 'Tổ chức' },
  { path: '/nhan-su', label: 'Nhân sự' },
  { path: '/cong-luong', label: 'Công-Lương' },
  { path: '/quan-tri', label: 'Quản trị' },
];

export default function AppLayout() {
  const dieuHuong = useNavigate();

  function dangXuat() {
    localStorage.clear();
    dieuHuong('/dang-nhap');
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{ width: 200, borderRight: '1px solid #eee', padding: 16 }}>
        <h3>HRMS</h3>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {MENU.map((m) => (
            <Link key={m.path} to={m.path}>
              {m.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main style={{ flex: 1, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <button onClick={dangXuat}>Đăng xuất</button>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
