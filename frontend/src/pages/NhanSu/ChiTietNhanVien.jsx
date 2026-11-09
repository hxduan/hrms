import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import HistoryModal from '../../components/HistoryModal';
import Icon from '../../components/Icon';
import { HuyHieu, ManHinhTai, ThongBao } from '../../components/ui';
import useTaiDuLieu from '../../hooks/useTaiDuLieu';
import { layChuCaiDau } from '../../utils/vaiTro';
import { TabHopDong, TabNghiViec, TabNguoiPhuThuoc, TabPhuCap, TabQuaTrinh, TabTongQuan } from './tabHoSo';

const CAC_TAB = [
  { key: 'tong-quan', nhan: 'Tổng quan' },
  { key: 'hop-dong', nhan: 'Hợp đồng' },
  { key: 'qua-trinh', nhan: 'Quá trình công tác' },
  { key: 'phu-cap', nhan: 'Phụ cấp' },
  { key: 'nguoi-phu-thuoc', nhan: 'Người phụ thuộc' },
  { key: 'nghi-viec', nhan: 'Nghỉ việc' },
];

/**
 * Trang hồ sơ nhân viên có các tab. Dùng cho 2 trường hợp:
 *   /nhan-su/:id        — admin/HR xem và chỉnh sửa
 *   /ho-so-cua-toi      — nhân viên xem hồ sơ của chính mình (chỉ đọc; backend chỉ trả đúng dữ liệu của họ)
 */
export default function ChiTietNhanVien({ toi = false }) {
  const { id } = useParams();
  const { coVaiTro } = useAuth();
  const [query, datQuery] = useSearchParams();
  const [lichSu, setLichSu] = useState(false);

  const choPhepSua = !toi && coVaiTro('admin', 'hr');
  const duongDanHoSo = toi ? '/nhan-vien/toi' : `/nhan-vien/${id}`;
  const { duLieu: hoSo, dangTai, loi, taiLai } = useTaiDuLieu(duongDanHoSo, undefined, { khoiTao: null });

  const tab = CAC_TAB.some((t) => t.key === query.get('tab')) ? query.get('tab') : 'tong-quan';
  const doiTab = (k) => datQuery(k === 'tong-quan' ? {} : { tab: k }, { replace: true });

  if (dangTai && !hoSo) return <ManHinhTai />;
  if (loi) return <ThongBao loai="loi">{loi}</ThongBao>;
  if (!hoSo) return null;

  const nvId = toi ? 'toi' : hoSo.Id;
  const chung = { nhanVienId: nvId, choPhepSua, onThayDoi: taiLai };

  return (
    <>
      <div className="hr-ho-so-dau">
        <span className="hr-avatar-lon">{layChuCaiDau(hoSo.HoTen)}</span>
        <div>
          <h1>{hoSo.HoTen}</h1>
          <div className="hr-goi-y" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <strong>{hoSo.MaNhanVien}</strong>
            <span>·</span>
            <span>{[hoSo.TenChucDanh, hoSo.TenPhongBan].filter(Boolean).join(' — ') || 'Chưa có vị trí'}</span>
            <HuyHieu loai={hoSo.DangLamViec ? 'ok' : 'do'}>{hoSo.DangLamViec ? 'Đang làm việc' : 'Đã nghỉ việc'}</HuyHieu>
          </div>
        </div>
        <span className="hr-gian" />
        {!toi && (
          <>
            <Link to="/nhan-su" className="hr-btn" style={{ textDecoration: 'none' }}>← Danh sách</Link>
            {choPhepSua && (
              <>
                <button type="button" className="hr-btn" onClick={() => setLichSu(true)}>
                  <Icon ten="lichSu" kichCo={16} /> Lịch sử
                </button>
                <Link to={`/nhan-su/${hoSo.Id}/sua`} className="hr-btn hr-btn-chinh" style={{ textDecoration: 'none' }}>
                  <Icon ten="sua" kichCo={16} /> Sửa hồ sơ
                </Link>
              </>
            )}
          </>
        )}
      </div>

      <nav className="hr-tab" aria-label="Các mục của hồ sơ">
        {CAC_TAB.map((t) => (
          <button key={t.key} type="button" className={tab === t.key ? 'active' : ''} aria-current={tab === t.key ? 'page' : undefined} onClick={() => doiTab(t.key)}>
            {t.nhan}
          </button>
        ))}
      </nav>

      {tab === 'tong-quan' && <TabTongQuan hoSo={hoSo} />}
      {tab === 'hop-dong' && <TabHopDong {...chung} />}
      {tab === 'qua-trinh' && <TabQuaTrinh {...chung} hoSo={hoSo} />}
      {tab === 'phu-cap' && <TabPhuCap {...chung} />}
      {tab === 'nguoi-phu-thuoc' && <TabNguoiPhuThuoc {...chung} />}
      {tab === 'nghi-viec' && <TabNghiViec {...chung} dangLamViec={!!hoSo.DangLamViec} />}

      {lichSu && <HistoryModal tenBang="NhanVien" banGhiId={hoSo.Id} tieuDe={`Lịch sử: ${hoSo.HoTen}`} onDong={() => setLichSu(false)} />}
    </>
  );
}
