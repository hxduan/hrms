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

const TINH_TRANG = {
  thieu: { loai: 'vang', nhan: 'Còn thiếu' },
  du: { loai: 'ok', nhan: 'Đủ biên chế' },
  vuot: { loai: 'do', nhan: 'Vượt định biên' },
};

/**
 * Hoạch định / định biên vị trí: số nhân sự được duyệt cho từng (phòng ban, chức danh) theo năm.
 * "Đang giữ" luôn được TÍNH LẠI từ danh sách nhân viên đang làm việc (không lưu cứng) nên không bao giờ lệch.
 */
export default function DinhBien() {
  const { coVaiTro } = useAuth();
  const choPhepSua = coVaiTro('admin', 'hr');
  const toast = useToast();
  const namHienTai = new Date().getFullYear();
  const [nam, setNam] = useState(namHienTai);
  const [locPhongBan, setLocPhongBan] = useState('');
  const [modal, setModal] = useState(null);
  const [lichSu, setLichSu] = useState(null);

  const phongBan = useTaiDuLieu('/phong-ban');
  const chucDanh = useTaiDuLieu('/chuc-danh');
  const { duLieu, dangTai, loi, taiLai } = useTaiDuLieu('/dinh-bien', { nam, phongBanId: locPhongBan || undefined });
  const { xoaMot, xoaNhieu } = useXoa({
    endpoint: '/dinh-bien',
    loai: 'định biên',
    layTen: (d) => `${d.TenPhongBan} — ${d.TenChucDanh} (${d.Nam})`,
    taiLai,
    xoaVinhVien: true,
  });

  const tuyChonPhongBan = useMemo(
    () => phongBan.duLieu.map((p) => ({ value: p.Id, label: `${'\u00A0\u00A0\u00A0'.repeat(p.Cap)}${p.Cap ? '└ ' : ''}${p.Ten}` })),
    [phongBan.duLieu]
  );
  const tuyChonChucDanh = useMemo(() => chucDanh.duLieu.map((c) => ({ value: c.Id, label: c.Ten })), [chucDanh.duLieu]);

  const tong = useMemo(() => {
    const duyet = duLieu.reduce((s, d) => s + d.SoLuongDuocDuyet, 0);
    const giu = duLieu.reduce((s, d) => s + d.SoLuongDangGiu, 0);
    return { duyet, giu, thieu: duLieu.filter((d) => d.TinhTrang === 'thieu').reduce((s, d) => s + d.ConLai, 0), vuot: duLieu.filter((d) => d.TinhTrang === 'vuot').length };
  }, [duLieu]);

  const cot = [
    { key: 'TenPhongBan', nhan: 'Phòng ban', render: (d) => <strong style={{ fontWeight: 600 }}>{d.TenPhongBan}</strong> },
    { key: 'TenChucDanh', nhan: 'Chức danh' },
    { key: 'SoLuongDuocDuyet', nhan: 'Định biên', canPhai: true },
    { key: 'SoLuongDangGiu', nhan: 'Đang giữ (hiện tại)', canPhai: true },
    { key: 'ConLai', nhan: 'Còn lại', canPhai: true, render: (d) => (d.ConLai < 0 ? <span style={{ color: 'var(--nguy-hiem)', fontWeight: 600 }}>{d.ConLai}</span> : d.ConLai) },
    { key: 'TinhTrang', nhan: 'Tình trạng', render: (d) => <HuyHieu loai={TINH_TRANG[d.TinhTrang].loai}>{TINH_TRANG[d.TinhTrang].nhan}</HuyHieu> },
    { key: 'GhiChu', nhan: 'Ghi chú', an: 'diDong', render: (d) => d.GhiChu ?? <span className="hr-goi-y">—</span> },
  ];

  function moForm() {
    const dong = modal.dong;
    const cacTruong = dong
      ? [
          { key: 'PhongBanId', nhan: 'Phòng ban', type: 'select', options: tuyChonPhongBan, chiDoc: true, khongGui: true },
          { key: 'ChucDanhId', nhan: 'Chức danh', type: 'select', options: tuyChonChucDanh, chiDoc: true, khongGui: true },
          { key: 'Nam', nhan: 'Năm', type: 'number', chiDoc: true, khongGui: true, goiY: 'Muốn đổi phòng ban/chức danh/năm hãy tạo định biên mới' },
          { key: 'SoLuongDuocDuyet', nhan: 'Số lượng được duyệt', type: 'number', batBuoc: true, nguyen: true, min: 0, max: 100000 },
          { key: 'GhiChu', nhan: 'Ghi chú', type: 'textarea', maxLength: 300 },
        ]
      : [
          { key: 'PhongBanId', nhan: 'Phòng ban', type: 'select', kieuSo: true, batBuoc: true, options: tuyChonPhongBan },
          { key: 'ChucDanhId', nhan: 'Chức danh', type: 'select', kieuSo: true, batBuoc: true, options: tuyChonChucDanh },
          { key: 'Nam', nhan: 'Năm', type: 'number', batBuoc: true, nguyen: true, min: 2000, max: 2100 },
          { key: 'SoLuongDuocDuyet', nhan: 'Số lượng được duyệt', type: 'number', batBuoc: true, nguyen: true, min: 0, max: 100000 },
          { key: 'GhiChu', nhan: 'Ghi chú', type: 'textarea', maxLength: 300 },
        ];

    return (
      <FormModal
        tieuDe={dong ? 'Sửa định biên' : `Thêm định biên năm ${nam}`}
        cacTruong={cacTruong}
        giaTriBanDau={
          dong
            ? { PhongBanId: dong.PhongBanId, ChucDanhId: dong.ChucDanhId, Nam: dong.Nam, SoLuongDuocDuyet: dong.SoLuongDuocDuyet, GhiChu: dong.GhiChu }
            : { Nam: nam, PhongBanId: locPhongBan }
        }
        onDong={() => setModal(null)}
        onSubmit={async (payload) => {
          if (dong) {
            const r = await api.put(`/dinh-bien/${dong.Id}`, payload);
            toast.thanhCong('Đã cập nhật định biên');
            if (r.data.canhBao) toast.loi(r.data.canhBao);
          } else {
            await api.post('/dinh-bien', payload);
            toast.thanhCong('Đã thêm định biên');
            if (payload.Nam !== nam) setNam(payload.Nam); // chuyển sang năm vừa tạo để thấy ngay dòng mới
          }
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button type="button" className="hr-btn hr-btn-icon" onClick={() => setNam((n) => n - 1)} aria-label="Năm trước">
            <Icon ten="phaiMuiTen" style={{ transform: 'rotate(180deg)' }} />
          </button>
          <input
            className="hr-input"
            type="number"
            style={{ width: 92, textAlign: 'center', fontWeight: 600 }}
            value={nam}
            min={2000}
            max={2100}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isInteger(n) && n >= 2000 && n <= 2100) setNam(n);
            }}
            aria-label="Năm định biên"
          />
          <button type="button" className="hr-btn hr-btn-icon" onClick={() => setNam((n) => n + 1)} aria-label="Năm sau">
            <Icon ten="phaiMuiTen" />
          </button>
        </div>
        <select className="hr-select" style={{ width: 260 }} value={locPhongBan} onChange={(e) => setLocPhongBan(e.target.value)} aria-label="Lọc theo phòng ban">
          <option value="">Tất cả phòng ban</option>
          {tuyChonPhongBan.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="hr-gian" />
        {choPhepSua && (
          <button type="button" className="hr-btn hr-btn-chinh" onClick={() => setModal({})}>
            <Icon ten="them" kichCo={16} /> Thêm định biên
          </button>
        )}
      </div>

      <div className="hr-luoi-the">
        <div className="hr-the hr-chi-so">
          <small>Tổng định biên {nam}</small>
          <strong>{tong.duyet}</strong>
        </div>
        <div className="hr-the hr-chi-so">
          <small>Đang giữ (hiện tại)</small>
          <strong>{tong.giu}</strong>
        </div>
        <div className="hr-the hr-chi-so">
          <small>Còn thiếu</small>
          <strong style={{ color: tong.thieu ? 'var(--canh-bao)' : undefined }}>{tong.thieu}</strong>
        </div>
        <div className="hr-the hr-chi-so">
          <small>Vị trí vượt định biên</small>
          <strong style={{ color: tong.vuot ? 'var(--nguy-hiem)' : undefined }}>{tong.vuot}</strong>
        </div>
      </div>

      <DataTable
        cotHienThi={cot}
        duLieu={duLieu}
        dangTai={dangTai}
        khongCoDuLieu={`Chưa có định biên nào cho năm ${nam}`}
        onSua={choPhepSua ? (d) => setModal({ dong: d }) : undefined}
        onXoa={choPhepSua ? xoaMot : undefined}
        onXoaNhieu={choPhepSua ? xoaNhieu : undefined}
        onLichSu={choPhepSua ? (d) => setLichSu(d) : undefined}
      />
      <p className="hr-goi-y" style={{ marginTop: 10 }}>
        "Đang giữ" là số nhân viên đang làm việc tại thời điểm hiện tại, không phải số liệu lịch sử của năm {nam}.
      </p>

      {modal && moForm()}
      {lichSu && (
        <HistoryModal
          tenBang="DinhBienViTri"
          banGhiId={lichSu.Id}
          tieuDe={`Lịch sử: ${lichSu.TenPhongBan} — ${lichSu.TenChucDanh}`}
          onDong={() => setLichSu(null)}
        />
      )}
    </>
  );
}
