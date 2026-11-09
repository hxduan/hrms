import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import DataTable from '../../components/DataTable';
import HistoryModal from '../../components/HistoryModal';
import Icon from '../../components/Icon';
import PhanTrang from '../../components/PhanTrang';
import { HuyHieu, ThongBao, TieuDeTrang } from '../../components/ui';
import useDebounce from '../../hooks/useDebounce';
import useTaiDuLieu from '../../hooks/useTaiDuLieu';
import useXoa from '../../hooks/useXoa';
import { ngayVN } from '../../utils/chuoi';
import { layChuCaiDau } from '../../utils/vaiTro';

/** Danh sách nhân viên: phân trang, lọc, sắp xếp PHÍA MÁY CHỦ; bộ lọc nằm trên URL nên quay lại từ trang chi tiết vẫn giữ nguyên. */
export default function DanhSachNhanVien() {
  const dieuHuong = useNavigate();
  const { coVaiTro } = useAuth();
  const [query, datQuery] = useSearchParams();
  const [lichSu, setLichSu] = useState(null);

  const trang = Math.max(1, Number(query.get('trang')) || 1);
  const soDong = [10, 20, 50, 100].includes(Number(query.get('soDong'))) ? Number(query.get('soDong')) : 20;
  const sapXep = query.get('sapXep') || 'MaNhanVien';
  const huong = query.get('huong') === 'DESC' ? 'DESC' : 'ASC';
  const phongBanId = query.get('phongBanId') || '';
  const chucDanhId = query.get('chucDanhId') || '';
  const trangThai = query.get('trangThai') ?? 'dang_lam';
  const tim = query.get('tim') || '';

  const capNhat = (thayDoi, { veTrang1 = true } = {}) => {
    const moi = new URLSearchParams(query);
    Object.entries(thayDoi).forEach(([k, v]) => (v === '' || v === null || v === undefined ? moi.delete(k) : moi.set(k, v)));
    if (veTrang1) moi.delete('trang');
    datQuery(moi, { replace: true });
  };

  // Ô tìm kiếm: gõ xong 300ms mới gọi API
  const [timNhap, setTimNhap] = useState(tim);
  const timDaTre = useDebounce(timNhap, 300);
  useEffect(() => {
    if (timDaTre !== tim) capNhat({ tim: timDaTre.trim() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timDaTre]);

  const params = { tim: tim || undefined, phongBanId: phongBanId || undefined, chucDanhId: chucDanhId || undefined, trangThai: trangThai === 'tat_ca' ? undefined : trangThai, sapXep, huong, trang, soDong };
  const { duLieu, dangTai, loi, taiLai } = useTaiDuLieu('/nhan-vien', params, { khoiTao: { dong: [], tongSo: 0 } });
  const phongBan = useTaiDuLieu('/phong-ban');
  const chucDanh = useTaiDuLieu('/chuc-danh');
  const { xoaMot, xoaNhieu } = useXoa({ endpoint: '/nhan-vien', loai: 'nhân viên', layTen: (d) => `${d.MaNhanVien} — ${d.HoTen}`, taiLai });

  const choPhepSua = coVaiTro('admin', 'hr');
  const doiSapXep = (cot) => capNhat({ sapXep: cot, huong: sapXep === cot && huong === 'ASC' ? 'DESC' : 'ASC' }, { veTrang1: false });

  const cot = useMemo(() => [
    { key: 'MaNhanVien', nhan: 'Mã NV', sapXep: 'MaNhanVien', render: (d) => <span style={{ color: 'var(--chu-phu)' }}>{d.MaNhanVien}</span> },
    {
      key: 'HoTen', nhan: 'Họ tên', sapXep: 'HoTen',
      render: (d) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="hr-avatar">{layChuCaiDau(d.HoTen)}</span>
          <div>
            <Link to={`/nhan-su/${d.Id}`} style={{ fontWeight: 600 }} onClick={(e) => e.stopPropagation()}>{d.HoTen}</Link>
            {d.Email && <div className="hr-goi-y">{d.Email}</div>}
          </div>
        </div>
      ),
    },
    { key: 'TenPhongBan', nhan: 'Phòng ban', sapXep: 'TenPhongBan', an: 'diDong', render: (d) => d.TenPhongBan ?? '—' },
    { key: 'TenChucDanh', nhan: 'Chức danh', sapXep: 'TenChucDanh', render: (d) => d.TenChucDanh ?? '—' },
    { key: 'NgayVaoLam', nhan: 'Vào làm', sapXep: 'NgayVaoLam', an: 'diDong', render: (d) => (d.NgayVaoLam ? ngayVN(d.NgayVaoLam) : '—') },
    {
      key: 'TrangThai', nhan: 'Trạng thái',
      render: (d) => (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <HuyHieu loai={d.DangLamViec ? 'ok' : 'do'}>{d.DangLamViec ? 'Đang làm' : 'Đã nghỉ'}</HuyHieu>
          {!d.CoTaiKhoan && d.DangLamViec && <HuyHieu loai="vang">Chưa có tài khoản</HuyHieu>}
        </div>
      ),
    },
  ], []);

  return (
    <>
      <TieuDeTrang tieuDe="Nhân sự" moTa="Hồ sơ nhân viên, hợp đồng, quá trình công tác">
        {choPhepSua && (
          <Link to="/nhan-su/them" className="hr-btn hr-btn-chinh" style={{ textDecoration: 'none' }}>
            <Icon ten="them" kichCo={16} /> Thêm nhân viên
          </Link>
        )}
      </TieuDeTrang>
      {loi && <ThongBao loai="loi">{loi}</ThongBao>}

      <div className="hr-bo-loc">
        <div className="hr-o-tim">
          <Icon ten="tim" kichCo={16} />
          <input className="hr-input" placeholder="Tìm theo tên, mã, SĐT, email, CCCD" value={timNhap} onChange={(e) => setTimNhap(e.target.value)} aria-label="Tìm nhân viên" />
        </div>
        <select className="hr-select" value={phongBanId} onChange={(e) => capNhat({ phongBanId: e.target.value })} aria-label="Lọc theo phòng ban">
          <option value="">Tất cả phòng ban</option>
          {phongBan.duLieu.map((p) => (
            <option key={p.Id} value={p.Id}>{`${'\u00A0\u00A0\u00A0'.repeat(p.Cap)}${p.Cap ? '└ ' : ''}${p.Ten}`}</option>
          ))}
        </select>
        <select className="hr-select" value={chucDanhId} onChange={(e) => capNhat({ chucDanhId: e.target.value })} aria-label="Lọc theo chức danh">
          <option value="">Tất cả chức danh</option>
          {chucDanh.duLieu.map((c) => (<option key={c.Id} value={c.Id}>{c.Ten}</option>))}
        </select>
        <select className="hr-select" value={trangThai} onChange={(e) => capNhat({ trangThai: e.target.value })} aria-label="Lọc theo trạng thái">
          <option value="dang_lam">Đang làm việc</option>
          <option value="da_nghi">Đã nghỉ việc</option>
          <option value="tat_ca">Tất cả</option>
        </select>
      </div>

      <DataTable
        cotHienThi={cot}
        duLieu={duLieu.dong}
        dangTai={dangTai}
        khongCoDuLieu={tim || phongBanId || chucDanhId ? 'Không có nhân viên nào khớp bộ lọc' : 'Chưa có nhân viên nào'}
        sapXepHienTai={{ cot: sapXep, huong }}
        onSapXep={doiSapXep}
        onXem={(d) => dieuHuong(`/nhan-su/${d.Id}`)}
        onSua={choPhepSua ? (d) => dieuHuong(`/nhan-su/${d.Id}/sua`) : undefined}
        onXoa={choPhepSua ? xoaMot : undefined}
        onXoaNhieu={choPhepSua ? xoaNhieu : undefined}
        onLichSu={choPhepSua ? (d) => setLichSu(d) : undefined}
        hanhDongThem={choPhepSua ? [
          { nhan: 'Hợp đồng', icon: 'donTu', onClick: (d) => dieuHuong(`/nhan-su/${d.Id}?tab=hop-dong`) },
          { nhan: 'Cho nghỉ việc', icon: 'dangXuat', hien: (d) => !!d.DangLamViec, onClick: (d) => dieuHuong(`/nhan-su/${d.Id}?tab=nghi-viec`) },
        ] : []}
      />
      <PhanTrang
        trang={duLieu.trang ?? trang} soDong={soDong} tongSo={duLieu.tongSo ?? 0}
        onDoiTrang={(p) => capNhat({ trang: p }, { veTrang1: false })}
        onDoiSoDong={(n) => capNhat({ soDong: n })}
      />
      {lichSu && <HistoryModal tenBang="NhanVien" banGhiId={lichSu.Id} tieuDe={`Lịch sử: ${lichSu.HoTen}`} onDong={() => setLichSu(null)} />}
    </>
  );
}
