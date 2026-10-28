import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from './Icon';
import { Quay } from './ui';

/**
 * Bảng dữ liệu dùng chung cho mọi màn hình danh sách.
 *
 * Cách thao tác (cả 3 đều cho cùng kết quả):
 *   1. Tích ô chọn ở đầu dòng -> thanh thao tác hiện ra ("Sửa" khi chọn đúng 1 dòng, "Xóa đã chọn" khi chọn >= 1)
 *   2. Chuột phải vào 1 dòng  -> menu Sửa / Lịch sử / Xóa tại vị trí con trỏ
 *   3. Nút ⋯ cuối dòng        -> cùng menu đó (dành cho cảm ứng/bàn phím, vì điện thoại không có chuột phải)
 *
 * Props:
 *  cotHienThi  [{ key, nhan, render?(dong), an?: 'diDong', canPhai?: true }]
 *  duLieu      mảng dòng;   layId(dong) mặc định dong.Id
 *  Các handler (bỏ qua handler nào thì chức năng đó ẩn đi — dùng để ẩn theo vai trò):
 *   onXem(dong) · onSua(dong) · onXoa(dong) · onXoaNhieu(ids, cacDong) · onLichSu(dong)
 *  hanhDongThem  [{ nhan, icon?, onClick(dong), hien?(dong) }]
 *  chonDuoc      false = không có cột tích chọn
 */
export default function DataTable({
  cotHienThi,
  duLieu,
  dangTai = false,
  layId = (d) => d.Id,
  chonDuoc = true,
  onXem,
  onSua,
  onXoa,
  onXoaNhieu,
  onLichSu,
  hanhDongThem = [],
  khongCoDuLieu = 'Chưa có dữ liệu',
}) {
  const [daChon, setDaChon] = useState(() => new Set());
  const [menu, setMenu] = useState(null); // { x, y, dong }
  const menuRef = useRef(null);
  const oChonTatCa = useRef(null);

  const choPhepChon = chonDuoc && !!(onSua || onXoaNhieu);

  // Khi dữ liệu tải lại, bỏ chọn những dòng không còn tồn tại
  useEffect(() => {
    setDaChon((truoc) => {
      if (truoc.size === 0) return truoc;
      const con = new Set(duLieu.map(layId));
      const moi = new Set([...truoc].filter((id) => con.has(id)));
      return moi.size === truoc.size ? truoc : moi;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duLieu]);

  // Ô "chọn tất cả" có trạng thái lưng chừng
  useEffect(() => {
    if (oChonTatCa.current) {
      oChonTatCa.current.indeterminate = daChon.size > 0 && daChon.size < duLieu.length;
    }
  }, [daChon, duLieu]);

  // Đóng menu khi bấm ra ngoài / Esc / cuộn / đổi cỡ cửa sổ
  useEffect(() => {
    if (!menu) return undefined;
    const dong = () => setMenu(null);
    const khiBamPhim = (e) => e.key === 'Escape' && dong();
    document.addEventListener('click', dong);
    document.addEventListener('keydown', khiBamPhim);
    window.addEventListener('scroll', dong, true);
    window.addEventListener('resize', dong);
    // đưa focus vào mục đầu tiên để dùng được bàn phím
    menuRef.current?.querySelector('button')?.focus();
    return () => {
      document.removeEventListener('click', dong);
      document.removeEventListener('keydown', khiBamPhim);
      window.removeEventListener('scroll', dong, true);
      window.removeEventListener('resize', dong);
    };
  }, [menu]);

  function chonMotDong(id) {
    setDaChon((t) => {
      const moi = new Set(t);
      if (moi.has(id)) moi.delete(id);
      else moi.add(id);
      return moi;
    });
  }
  const chonTatCa = () =>
    setDaChon((t) => (t.size === duLieu.length ? new Set() : new Set(duLieu.map(layId))));

  /** Các mục của menu cho 1 dòng (đã lọc theo handler/quyền có sẵn). */
  function cacMucMenu(dong) {
    const muc = [];
    if (onSua) muc.push({ nhan: 'Sửa', icon: 'sua', chay: () => onSua(dong) });
    for (const h of hanhDongThem) {
      if (!h.hien || h.hien(dong)) muc.push({ nhan: h.nhan, icon: h.icon, chay: () => h.onClick(dong) });
    }
    if (onLichSu) muc.push({ nhan: 'Lịch sử thay đổi', icon: 'lichSu', chay: () => onLichSu(dong) });
    if (onXoa) muc.push({ nhan: 'Xóa', icon: 'xoa', nguyHiem: true, chay: () => onXoa(dong) });
    return muc;
  }

  const coMenu = !!(onSua || onXoa || onLichSu || hanhDongThem.length);

  function moMenuTaiToaDo(e, dong) {
    const soMuc = cacMucMenu(dong).length;
    const rong = 230;
    const cao = soMuc * 38 + 16;
    const x = Math.max(8, Math.min(e.clientX, window.innerWidth - rong - 8));
    const y = Math.max(8, Math.min(e.clientY, window.innerHeight - cao - 8));
    setMenu({ x, y, dong });
  }

  const dongDaChon = useMemo(() => duLieu.filter((d) => daChon.has(layId(d))), [duLieu, daChon]); // eslint-disable-line react-hooks/exhaustive-deps
  const soCot = cotHienThi.length + (choPhepChon ? 1 : 0) + (coMenu ? 1 : 0);

  return (
    <div className="hr-the" style={{ overflow: 'hidden' }}>
      {choPhepChon && daChon.size > 0 && (
        <div className="hr-thanh-chon" role="toolbar" aria-label="Thao tác với các mục đã chọn">
          <span>{daChon.size} mục đã chọn</span>
          <span className="hr-gian" />
          {onSua && daChon.size === 1 && (
            <button type="button" className="hr-btn hr-btn-nho" onClick={() => onSua(dongDaChon[0])}>
              <Icon ten="sua" kichCo={15} /> Sửa
            </button>
          )}
          {onXoaNhieu && (
            <button
              type="button"
              className="hr-btn hr-btn-nho hr-btn-vien-nguy-hiem"
              onClick={() => onXoaNhieu(dongDaChon.map(layId), dongDaChon)}
            >
              <Icon ten="xoa" kichCo={15} /> Xóa đã chọn
            </button>
          )}
          <button type="button" className="hr-btn hr-btn-nho" onClick={() => setDaChon(new Set())}>
            Bỏ chọn
          </button>
        </div>
      )}

      <div className="hr-bang-boc">
        <table className="hr-bang">
          <thead>
            <tr>
              {choPhepChon && (
                <th className="hr-cot-chon">
                  <input
                    ref={oChonTatCa}
                    type="checkbox"
                    aria-label="Chọn tất cả"
                    checked={duLieu.length > 0 && daChon.size === duLieu.length}
                    onChange={chonTatCa}
                    disabled={duLieu.length === 0}
                  />
                </th>
              )}
              {cotHienThi.map((c) => (
                <th key={c.key} className={`${c.an === 'diDong' ? 'hr-an-di-dong' : ''} ${c.canPhai ? 'hr-so' : ''}`}>
                  {c.nhan}
                </th>
              ))}
              {coMenu && <th className="hr-cot-hanh-dong" aria-label="Thao tác" />}
            </tr>
          </thead>
          <tbody>
            {dangTai && (
              <tr>
                <td colSpan={soCot} className="hr-rong">
                  <Quay /> Đang tải...
                </td>
              </tr>
            )}
            {!dangTai && duLieu.length === 0 && (
              <tr>
                <td colSpan={soCot} className="hr-rong">
                  {khongCoDuLieu}
                </td>
              </tr>
            )}
            {!dangTai &&
              duLieu.map((dong) => {
                const id = layId(dong);
                const chon = daChon.has(id);
                return (
                  <tr
                    key={id}
                    className={`${chon ? 'dang-chon' : ''} ${onXem ? 'bam-duoc' : ''}`}
                    onClick={() => onXem?.(dong)}
                    onContextMenu={(e) => {
                      if (!coMenu) return;
                      e.preventDefault(); // chặn menu mặc định của trình duyệt
                      moMenuTaiToaDo(e, dong);
                    }}
                  >
                    {choPhepChon && (
                      <td className="hr-cot-chon" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label={`Chọn dòng ${id}`}
                          checked={chon}
                          onChange={() => chonMotDong(id)}
                        />
                      </td>
                    )}
                    {cotHienThi.map((c) => (
                      <td key={c.key} className={`${c.an === 'diDong' ? 'hr-an-di-dong' : ''} ${c.canPhai ? 'hr-so' : ''}`}>
                        {c.render ? c.render(dong) : dong[c.key] ?? '—'}
                      </td>
                    ))}
                    {coMenu && (
                      <td className="hr-cot-hanh-dong" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="hr-btn hr-btn-icon"
                          aria-label="Mở menu thao tác"
                          aria-haspopup="menu"
                          onClick={(e) => {
                            e.stopPropagation(); // không để listener "bấm ra ngoài" đóng menu ngay lập tức
                            const r = e.currentTarget.getBoundingClientRect();
                            moMenuTaiToaDo({ clientX: r.right - 220, clientY: r.bottom + 4 }, dong);
                          }}
                        >
                          <Icon ten="nhieuHon" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {menu && (
        <ul ref={menuRef} className="hr-menu-ngu-canh" role="menu" style={{ left: menu.x, top: menu.y }} onClick={(e) => e.stopPropagation()}>
          {cacMucMenu(menu.dong).map((m) => (
            <li key={m.nhan} role="none">
              <button
                type="button"
                role="menuitem"
                className={m.nguyHiem ? 'nguy-hiem' : ''}
                onClick={() => {
                  setMenu(null);
                  m.chay();
                }}
              >
                {m.icon && <Icon ten={m.icon} kichCo={16} />} {m.nhan}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
