import { useMemo, useState } from 'react';
import api from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import DataTable from '../../components/DataTable';
import { useToast } from '../../components/Feedback';
import FormModal from '../../components/FormModal';
import HistoryModal from '../../components/HistoryModal';
import Icon from '../../components/Icon';
import { HuyHieu, ThongBao } from '../../components/ui';
import useTaiDuLieu from '../../hooks/useTaiDuLieu';
import useXoa from '../../hooks/useXoa';
import { chuaChuoi } from '../../utils/chuoi';

/** Chức vụ = cấp bậc quản lý (Giám đốc, Trưởng phòng, Phó phòng, Nhân viên...). Thứ tự nhỏ = cấp cao hơn. */
export default function ChucVu() {
  const { coVaiTro } = useAuth();
  const choPhepSua = coVaiTro('admin', 'hr');
  const toast = useToast();
  const [locPhongBan, setLocPhongBan] = useState(''); // '' = tất cả, '0' = dùng chung, số = 1 phòng ban
  const [tim, setTim] = useState('');
  const [modal, setModal] = useState(null);
  const [lichSu, setLichSu] = useState(null);

  const phongBan = useTaiDuLieu('/phong-ban');
  const { duLieu, dangTai, loi, taiLai } = useTaiDuLieu('/chuc-vu', locPhongBan ? { phongBanId: locPhongBan } : undefined);
  const { xoaMot, xoaNhieu } = useXoa({ endpoint: '/chuc-vu', loai: 'chức vụ', layTen: (d) => d.Ten, taiLai });

  const hienThi = useMemo(() => duLieu.filter((d) => !tim.trim() || chuaChuoi(d.Ten, tim)), [duLieu, tim]);
  const tuyChonPhongBan = useMemo(
    () => phongBan.duLieu.map((p) => ({ value: p.Id, label: `${'\u00A0\u00A0\u00A0'.repeat(p.Cap)}${p.Cap ? '└ ' : ''}${p.Ten}` })),
    [phongBan.duLieu]
  );

  const cot = [
    { key: 'Ten', nhan: 'Chức vụ', render: (d) => <strong style={{ fontWeight: 600 }}>{d.Ten}</strong> },
    { key: 'TenPhongBan', nhan: 'Phạm vi', render: (d) => d.TenPhongBan ?? <HuyHieu>Dùng chung toàn công ty</HuyHieu> },
    { key: 'ThuTu', nhan: 'Cấp bậc', an: 'diDong', canPhai: true },
    { key: 'SoNhanVien', nhan: 'Nhân viên', canPhai: true },
  ];

  function moForm() {
    const dong = modal.dong;
    const cacTruong = [
      {
        key: 'Ten',
        nhan: 'Tên chức vụ',
        batBuoc: true,
        maxLength: 200,
        kiemTraTrung: async (v, tatCa) => {
          const r = await api.get('/chuc-vu/kiem-tra', { params: { giaTri: v, phongBanId: tatCa.PhongBanId || undefined, boQuaId: dong?.Id } });
          return r.data.daTonTai ? r.data.message : null;
        },
      },
      {
        key: 'PhongBanId',
        nhan: 'Phạm vi áp dụng',
        type: 'select',
        kieuSo: true,
        placeholder: '— Dùng chung toàn công ty —',
        options: tuyChonPhongBan,
        goiY: 'Để trống nếu chức vụ dùng cho mọi phòng ban (VD Giám đốc, Trưởng phòng)',
      },
      { key: 'ThuTu', nhan: 'Cấp bậc (thứ tự)', type: 'number', nguyen: true, min: 0, max: 9999, goiY: 'Số nhỏ = cấp cao hơn (VD 1 = Giám đốc, 2 = Trưởng phòng)' },
    ];
    return (
      <FormModal
        tieuDe={dong ? `Sửa chức vụ "${dong.Ten}"` : 'Thêm chức vụ'}
        cacTruong={cacTruong}
        giaTriBanDau={dong ? { Ten: dong.Ten, PhongBanId: dong.PhongBanId, ThuTu: dong.ThuTu } : { ThuTu: 0 }}
        onDong={() => setModal(null)}
        onSubmit={async (payload) => {
          if (dong) await api.put(`/chuc-vu/${dong.Id}`, payload);
          else await api.post('/chuc-vu', payload);
          toast.thanhCong(dong ? 'Đã cập nhật chức vụ' : 'Đã thêm chức vụ');
          setModal(null);
          taiLai();
        }}
      />
    );
  }

  return (
    <>
      {loi && <ThongBao loai="loi">{loi}</ThongBao>}
      <div className="hr-thanh-cong-cu">
        <div className="hr-o-tim">
          <Icon ten="tim" kichCo={16} />
          <input className="hr-input" placeholder="Tìm chức vụ" value={tim} onChange={(e) => setTim(e.target.value)} aria-label="Tìm chức vụ" />
        </div>
        <select className="hr-select" style={{ width: 240 }} value={locPhongBan} onChange={(e) => setLocPhongBan(e.target.value)} aria-label="Lọc theo phạm vi">
          <option value="">Tất cả phạm vi</option>
          <option value="0">Dùng chung toàn công ty</option>
          {tuyChonPhongBan.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="hr-gian" />
        {choPhepSua && (
          <button type="button" className="hr-btn hr-btn-chinh" onClick={() => setModal({})}>
            <Icon ten="them" kichCo={16} /> Thêm chức vụ
          </button>
        )}
      </div>
      <DataTable
        cotHienThi={cot}
        duLieu={hienThi}
        dangTai={dangTai}
        khongCoDuLieu="Chưa có chức vụ nào"
        onSua={choPhepSua ? (d) => setModal({ dong: d }) : undefined}
        onXoa={choPhepSua ? xoaMot : undefined}
        onXoaNhieu={choPhepSua ? xoaNhieu : undefined}
        onLichSu={choPhepSua ? (d) => setLichSu(d) : undefined}
      />
      {modal && moForm()}
      {lichSu && <HistoryModal tenBang="ChucVu" banGhiId={lichSu.Id} tieuDe={`Lịch sử: ${lichSu.Ten}`} onDong={() => setLichSu(null)} />}
    </>
  );
}
