import { useMemo, useState } from 'react';
import api from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import DataTable from '../../components/DataTable';
import { useToast } from '../../components/Feedback';
import FormModal from '../../components/FormModal';
import HistoryModal from '../../components/HistoryModal';
import Icon from '../../components/Icon';
import { ThongBao } from '../../components/ui';
import useTaiDuLieu from '../../hooks/useTaiDuLieu';
import useXoa from '../../hooks/useXoa';
import { chuaChuoi } from '../../utils/chuoi';

/** Chức danh = tên công việc chuyên môn (Kỹ sư phần mềm, Kế toán viên...). Định biên được tính theo chức danh. */
export default function ChucDanh() {
  const { coVaiTro } = useAuth();
  const choPhepSua = coVaiTro('admin', 'hr');
  const toast = useToast();
  const [tim, setTim] = useState('');
  const [modal, setModal] = useState(null);
  const [lichSu, setLichSu] = useState(null);
  const { duLieu, dangTai, loi, taiLai } = useTaiDuLieu('/chuc-danh');
  const { xoaMot, xoaNhieu } = useXoa({ endpoint: '/chuc-danh', loai: 'chức danh', layTen: (d) => d.Ten, taiLai });

  const hienThi = useMemo(() => duLieu.filter((d) => !tim.trim() || chuaChuoi(d.Ten, tim)), [duLieu, tim]);
  const cot = [
    { key: 'Ten', nhan: 'Chức danh', render: (d) => <strong style={{ fontWeight: 600 }}>{d.Ten}</strong> },
    { key: 'SoDinhBien', nhan: 'Dòng định biên', an: 'diDong', canPhai: true },
    { key: 'SoNhanVien', nhan: 'Nhân viên', canPhai: true },
  ];

  function moForm() {
    const dong = modal.dong;
    const cacTruong = [
      {
        key: 'Ten',
        nhan: 'Tên chức danh',
        batBuoc: true,
        maxLength: 200,
        kiemTraTrung: async (v) => {
          const r = await api.get('/chuc-danh/kiem-tra', { params: { giaTri: v, boQuaId: dong?.Id } });
          return r.data.daTonTai ? r.data.message : null;
        },
      },
    ];
    return (
      <FormModal
        tieuDe={dong ? `Sửa chức danh "${dong.Ten}"` : 'Thêm chức danh'}
        cacTruong={cacTruong}
        giaTriBanDau={dong ? { Ten: dong.Ten } : {}}
        onDong={() => setModal(null)}
        onSubmit={async (payload) => {
          if (dong) await api.put(`/chuc-danh/${dong.Id}`, payload);
          else await api.post('/chuc-danh', payload);
          toast.thanhCong(dong ? 'Đã cập nhật chức danh' : 'Đã thêm chức danh');
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
          <input className="hr-input" placeholder="Tìm chức danh" value={tim} onChange={(e) => setTim(e.target.value)} aria-label="Tìm chức danh" />
        </div>
        <span className="hr-gian" />
        {choPhepSua && (
          <button type="button" className="hr-btn hr-btn-chinh" onClick={() => setModal({})}>
            <Icon ten="them" kichCo={16} /> Thêm chức danh
          </button>
        )}
      </div>
      <DataTable
        cotHienThi={cot}
        duLieu={hienThi}
        dangTai={dangTai}
        khongCoDuLieu="Chưa có chức danh nào"
        onSua={choPhepSua ? (d) => setModal({ dong: d }) : undefined}
        onXoa={choPhepSua ? xoaMot : undefined}
        onXoaNhieu={choPhepSua ? xoaNhieu : undefined}
        onLichSu={choPhepSua ? (d) => setLichSu(d) : undefined}
      />
      {modal && moForm()}
      {lichSu && <HistoryModal tenBang="ChucDanh" banGhiId={lichSu.Id} tieuDe={`Lịch sử: ${lichSu.Ten}`} onDong={() => setLichSu(null)} />}
    </>
  );
}
