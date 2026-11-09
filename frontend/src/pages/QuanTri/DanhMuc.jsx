import { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import TabDanhSach from '../../components/TabDanhSach';
import { HuyHieu } from '../../components/ui';

const CACH_TINH_THUE = { luy_tien: 'Lũy tiến từng phần', khau_tru_10: 'Khấu trừ 10%' };
const TAB = [{ key: 'loai-hop-dong', nhan: 'Loại hợp đồng' }, { key: 'ly-do-nghi-viec', nhan: 'Lý do nghỉ việc' }];

/** Danh mục dùng cho Nhân sự. Cờ "đóng bảo hiểm" và "cách tính thuế" của loại hợp đồng sẽ quyết định cách tính lương ở các giai đoạn sau. */
export default function DanhMuc() {
  const { coVaiTro } = useAuth();
  const [tab, setTab] = useState('loai-hop-dong');
  const choPhepSua = coVaiTro('admin', 'hr');

  return (
    <>
      <nav className="hr-tab" aria-label="Danh mục">
        {TAB.map((t) => (
          <button key={t.key} type="button" className={tab === t.key ? 'active' : ''} onClick={() => setTab(t.key)}>{t.nhan}</button>
        ))}
      </nav>

      {tab === 'loai-hop-dong' && (
        <TabDanhSach
          key="lhd" endpoint="/danh-muc-nhan-su/loai-hop-dong" tenBang="LoaiHopDong" loai="loại hợp đồng" nhanThem="Thêm loại hợp đồng" choPhepSua={choPhepSua}
          moTa="Các cờ bên dưới ảnh hưởng trực tiếp tới tính bảo hiểm và thuế. Hãy nhờ kế toán xác nhận theo quy định hiện hành trước khi dùng cho lương thật."
          cot={[
            { key: 'Ten', nhan: 'Loại hợp đồng', render: (d) => <strong style={{ fontWeight: 600 }}>{d.Ten}</strong> },
            { key: 'CoDongBaoHiem', nhan: 'Đóng bảo hiểm', render: (d) => <HuyHieu loai={d.CoDongBaoHiem ? 'ok' : undefined}>{d.CoDongBaoHiem ? 'Có' : 'Không'}</HuyHieu> },
            { key: 'KieuTinhThue', nhan: 'Cách tính thuế TNCN', render: (d) => CACH_TINH_THUE[d.KieuTinhThue] },
            { key: 'SoDangDung', nhan: 'Đang dùng', canPhai: true },
          ]}
          cacTruong={[
            { key: 'Ten', nhan: 'Tên loại hợp đồng', batBuoc: true, maxLength: 100 },
            { key: 'CoDongBaoHiem', nhan: 'Có đóng BHXH, BHYT, BHTN', type: 'checkbox' },
            { key: 'KieuTinhThue', nhan: 'Cách tính thuế TNCN', type: 'select', batBuoc: true, options: Object.entries(CACH_TINH_THUE).map(([value, label]) => ({ value, label })) },
          ]}
          giaTriBanDau={(d) => (d ? { Ten: d.Ten, CoDongBaoHiem: !!d.CoDongBaoHiem, KieuTinhThue: d.KieuTinhThue } : { CoDongBaoHiem: true, KieuTinhThue: 'luy_tien' })}
          layTen={(d) => d.Ten}
        />
      )}

      {tab === 'ly-do-nghi-viec' && (
        <TabDanhSach
          key="ldnv" endpoint="/danh-muc-nhan-su/ly-do-nghi-viec" tenBang="LyDoNghiViec" loai="lý do nghỉ việc" nhanThem="Thêm lý do" choPhepSua={choPhepSua}
          cot={[
            { key: 'Ten', nhan: 'Lý do nghỉ việc', render: (d) => <strong style={{ fontWeight: 600 }}>{d.Ten}</strong> },
            { key: 'SoDangDung', nhan: 'Đang dùng', canPhai: true },
          ]}
          cacTruong={[{ key: 'Ten', nhan: 'Lý do', batBuoc: true, maxLength: 200 }]}
          giaTriBanDau={(d) => (d ? { Ten: d.Ten } : {})}
          layTen={(d) => d.Ten}
        />
      )}
    </>
  );
}
