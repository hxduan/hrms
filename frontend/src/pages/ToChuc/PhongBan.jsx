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

/** Tập id của `id` và toàn bộ con, cháu của nó (dùng để không cho chọn làm phòng ban cha). */
function layCayCon(duLieu, id) {
  const tap = new Set([id]);
  let doi = true;
  while (doi) {
    doi = false;
    for (const d of duLieu) {
      if (d.PhongBanChaId && tap.has(d.PhongBanChaId) && !tap.has(d.Id)) {
        tap.add(d.Id);
        doi = true;
      }
    }
  }
  return tap;
}

export default function PhongBan() {
  const { coVaiTro } = useAuth();
  const choPhepSua = coVaiTro('admin', 'hr');
  const toast = useToast();
  const { duLieu, dangTai, loi, taiLai } = useTaiDuLieu('/phong-ban');
  const [tim, setTim] = useState('');
  const [thuGon, setThuGon] = useState(() => new Set());
  const [modal, setModal] = useState(null); // { dong?: phòng ban đang sửa, chaId?: cha gợi ý khi thêm con }
  const [lichSu, setLichSu] = useState(null);
  const { xoaMot, xoaNhieu } = useXoa({ endpoint: '/phong-ban', loai: 'phòng ban', layTen: (d) => d.Ten, taiLai });

  const theoId = useMemo(() => new Map(duLieu.map((d) => [d.Id, d])), [duLieu]);
  const dangTim = tim.trim() !== '';

  // Đang tìm: danh sách phẳng. Không tìm: ẩn các dòng có tổ tiên đang thu gọn.
  const hienThi = useMemo(() => {
    if (dangTim) return duLieu.filter((d) => chuaChuoi(d.Ten, tim) || chuaChuoi(d.MaPhongBan, tim));
    return duLieu.filter((d) => {
      let cha = d.PhongBanChaId;
      for (let i = 0; cha && i < 50; i++) {
        if (thuGon.has(cha)) return false;
        cha = theoId.get(cha)?.PhongBanChaId;
      }
      return true;
    });
  }, [duLieu, dangTim, tim, thuGon, theoId]);

  const coCon = useMemo(() => duLieu.filter((d) => d.SoPhongBanCon > 0).map((d) => d.Id), [duLieu]);
  const bat = (id) =>
    setThuGon((t) => {
      const moi = new Set(t);
      if (moi.has(id)) moi.delete(id);
      else moi.add(id);
      return moi;
    });

  const cot = [
    {
      key: 'Ten',
      nhan: 'Phòng ban',
      render: (d) => (
        <div style={{ display: 'flex', alignItems: 'center', paddingLeft: dangTim ? 0 : d.Cap * 22 }}>
          {d.SoPhongBanCon > 0 && !dangTim ? (
            <button
              type="button"
              className="hr-cay-nut"
              aria-label={thuGon.has(d.Id) ? `Mở rộng ${d.Ten}` : `Thu gọn ${d.Ten}`}
              aria-expanded={!thuGon.has(d.Id)}
              onClick={(e) => {
                e.stopPropagation();
                bat(d.Id);
              }}
            >
              <Icon ten={thuGon.has(d.Id) ? 'phaiMuiTen' : 'xuongMuiTen'} kichCo={15} />
            </button>
          ) : (
            <span className="hr-cay-cho" />
          )}
          <span style={{ fontWeight: d.Cap === 0 ? 700 : 500 }}>{d.Ten}</span>
          {d.MaPhongBan && <span className="hr-ma">{d.MaPhongBan}</span>}
        </div>
      ),
    },
    { key: 'TenPhongBanCha', nhan: 'Trực thuộc', an: 'diDong', render: (d) => d.TenPhongBanCha ?? <span className="hr-goi-y">— (cấp cao nhất)</span> },
    { key: 'ThuTu', nhan: 'Thứ tự', an: 'diDong', canPhai: true },
    { key: 'SoChucVu', nhan: 'Chức vụ', an: 'diDong', canPhai: true },
    { key: 'SoNhanVien', nhan: 'Nhân viên', canPhai: true },
  ];

  const kiemTraTrung = (truong, tenForm) => async (v, tatCa) => {
    const r = await api.get('/phong-ban/kiem-tra', {
      params: { truong, giaTri: v, phongBanChaId: tatCa.PhongBanChaId || undefined, boQuaId: modal?.dong?.Id },
    });
    return r.data.daTonTai ? r.data.message ?? `${tenForm} đã tồn tại` : null;
  };

  function moForm() {
    const dong = modal.dong;
    const loaiTru = dong ? layCayCon(duLieu, dong.Id) : new Set();
    const tuyChonCha = duLieu
      .filter((d) => !loaiTru.has(d.Id))
      .map((d) => ({ value: d.Id, label: `${'\u00A0\u00A0\u00A0'.repeat(d.Cap)}${d.Cap ? '└ ' : ''}${d.Ten}` }));

    const cacTruong = [
      { key: 'Ten', nhan: 'Tên phòng ban', batBuoc: true, maxLength: 200, kiemTraTrung: kiemTraTrung('Ten', 'Tên') },
      {
        key: 'MaPhongBan',
        nhan: 'Mã phòng ban',
        maxLength: 30,
        mau: /^[A-Za-z0-9_.-]+$/,
        thongBaoMau: 'Mã chỉ gồm chữ không dấu, số và . _ -',
        goiY: 'Tuỳ chọn. Chữ không dấu, số và . _ - (dùng để khớp dữ liệu khi import Excel)',
        kiemTraTrung: kiemTraTrung('MaPhongBan', 'Mã'),
      },
      {
        key: 'PhongBanChaId',
        nhan: 'Trực thuộc',
        type: 'select',
        kieuSo: true,
        placeholder: '— Cấp cao nhất (không có phòng ban cha) —',
        options: tuyChonCha,
        goiY: dong ? 'Không thể chọn chính nó hoặc phòng ban con/cháu của nó làm cha' : undefined,
      },
      { key: 'ThuTu', nhan: 'Thứ tự hiển thị', type: 'number', nguyen: true, min: 0, max: 9999, goiY: 'Số nhỏ hiển thị trước trong cùng một đơn vị cha' },
    ];
    const giaTriBanDau = dong
      ? { Ten: dong.Ten, MaPhongBan: dong.MaPhongBan, PhongBanChaId: dong.PhongBanChaId, ThuTu: dong.ThuTu }
      : { PhongBanChaId: modal.chaId ?? '', ThuTu: 0 };

    return (
      <FormModal
        tieuDe={dong ? `Sửa phòng ban "${dong.Ten}"` : modal.chaId ? `Thêm phòng ban con của "${theoId.get(modal.chaId)?.Ten}"` : 'Thêm phòng ban'}
        cacTruong={cacTruong}
        giaTriBanDau={giaTriBanDau}
        onDong={() => setModal(null)}
        onSubmit={async (payload) => {
          if (dong) await api.put(`/phong-ban/${dong.Id}`, payload);
          else await api.post('/phong-ban', payload);
          toast.thanhCong(dong ? 'Đã cập nhật phòng ban' : 'Đã thêm phòng ban');
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
          <input className="hr-input" placeholder="Tìm theo tên hoặc mã (không cần gõ dấu)" value={tim} onChange={(e) => setTim(e.target.value)} aria-label="Tìm phòng ban" />
        </div>
        {!dangTim && coCon.length > 0 && (
          <button type="button" className="hr-btn" onClick={() => setThuGon(thuGon.size ? new Set() : new Set(coCon))}>
            {thuGon.size ? 'Mở rộng tất cả' : 'Thu gọn tất cả'}
          </button>
        )}
        <span className="hr-gian" />
        <span className="hr-goi-y">{duLieu.length} phòng ban</span>
        {choPhepSua && (
          <button type="button" className="hr-btn hr-btn-chinh" onClick={() => setModal({})}>
            <Icon ten="them" kichCo={16} /> Thêm phòng ban
          </button>
        )}
      </div>

      <DataTable
        cotHienThi={cot}
        duLieu={hienThi}
        dangTai={dangTai}
        khongCoDuLieu={dangTim ? 'Không có phòng ban nào khớp từ khóa' : 'Chưa có phòng ban nào'}
        onSua={choPhepSua ? (d) => setModal({ dong: d }) : undefined}
        onXoa={choPhepSua ? xoaMot : undefined}
        onXoaNhieu={choPhepSua ? xoaNhieu : undefined}
        onLichSu={choPhepSua ? (d) => setLichSu(d) : undefined}
        hanhDongThem={choPhepSua ? [{ nhan: 'Thêm phòng ban con', icon: 'them', onClick: (d) => setModal({ chaId: d.Id }) }] : []}
      />

      {modal && moForm()}
      {lichSu && <HistoryModal tenBang="PhongBan" banGhiId={lichSu.Id} tieuDe={`Lịch sử: ${lichSu.Ten}`} onDong={() => setLichSu(null)} />}
    </>
  );
}
