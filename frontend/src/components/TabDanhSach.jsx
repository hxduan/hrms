import { useState } from 'react';
import api from '../api/client';
import DataTable from './DataTable';
import { useToast } from './Feedback';
import FormModal from './FormModal';
import HistoryModal from './HistoryModal';
import Icon from './Icon';
import { ThongBao } from './ui';
import useTaiDuLieu from '../hooks/useTaiDuLieu';
import useXoa from '../hooks/useXoa';

/**
 * Bảng + form thêm/sửa/xóa cho 1 danh sách con (một "tab" của hồ sơ, hoặc một danh mục nhỏ). Cấu hình bằng props:
 *  endpoint      '/nhan-vien/5/hop-dong' hoặc '/danh-muc-nhan-su/loai-hop-dong'
 *  cot           cột của DataTable, hoặc hàm (duLieu) => cột
 *  cacTruong     mảng ô của form, hoặc hàm (dong|null) => mảng ô
 *  giaTriBanDau  (dong|null) => object giá trị ban đầu của form
 *  layTen        (dong) => chuỗi mô tả dùng trong hộp thoại xóa
 *  tenBang       tên bảng để xem lịch sử thay đổi (để trống = không có nút lịch sử)
 *  choPhepSua    false = chỉ xem
 *  Tự xử lý lỗi 409 VUOT_DINH_BIEN: hỏi lý do rồi gửi lại kèm xác nhận.
 */
export default function TabDanhSach({
  endpoint, cot, cacTruong, giaTriBanDau = () => ({}), layTen, loai, nhanThem = 'Thêm', tieuDeThem, tieuDeSua,
  tenBang, choPhepSua = true, moTa, khongCoDuLieu = 'Chưa có dữ liệu', rongForm = false, luoi = false, onThayDoi,
  hanhDongThem = [], tuLoc,
}) {
  const toast = useToast();
  const { duLieu, dangTai, loi, taiLai } = useTaiDuLieu(endpoint);
  const [modal, setModal] = useState(null); // { dong? }
  const [vuot, setVuot] = useState(null); // { payload, canhBao, dong }
  const [lichSu, setLichSu] = useState(null);
  const sauKhiDoi = () => {
    taiLai();
    onThayDoi?.();
  };
  const { xoaMot } = useXoa({ endpoint, loai, layTen, taiLai: sauKhiDoi });

  async function gui(dong, payload) {
    if (dong) await api.put(`${endpoint}/${dong.Id}`, payload);
    else await api.post(endpoint, payload);
    toast.thanhCong(dong ? 'Đã cập nhật' : 'Đã thêm');
    setModal(null);
    setVuot(null);
    sauKhiDoi();
  }

  const hienThi = tuLoc ? duLieu.filter(tuLoc) : duLieu;
  const cotHienThi = typeof cot === 'function' ? cot(duLieu) : cot;

  return (
    <>
      {moTa && <ThongBao loai="thongTin">{moTa}</ThongBao>}
      {loi && <ThongBao loai="loi">{loi}</ThongBao>}
      {choPhepSua && (
        <div className="hr-thanh-cong-cu">
          <span className="hr-gian" />
          <button type="button" className="hr-btn hr-btn-chinh" onClick={() => setModal({})}>
            <Icon ten="them" kichCo={16} /> {nhanThem}
          </button>
        </div>
      )}
      <DataTable
        cotHienThi={cotHienThi}
        duLieu={hienThi}
        dangTai={dangTai}
        chonDuoc={false}
        khongCoDuLieu={khongCoDuLieu}
        onSua={choPhepSua ? (d) => setModal({ dong: d }) : undefined}
        onXoa={choPhepSua ? xoaMot : undefined}
        onLichSu={choPhepSua && tenBang ? (d) => setLichSu(d) : undefined}
        hanhDongThem={choPhepSua ? hanhDongThem : []}
      />

      {modal && (
        <FormModal
          tieuDe={modal.dong ? tieuDeSua ?? 'Sửa' : tieuDeThem ?? nhanThem}
          rong={rongForm}
          luoi={luoi}
          cacTruong={typeof cacTruong === 'function' ? cacTruong(modal.dong ?? null) : cacTruong}
          giaTriBanDau={giaTriBanDau(modal.dong ?? null)}
          onDong={() => setModal(null)}
          onSubmit={async (payload) => {
            try {
              await gui(modal.dong, payload);
            } catch (e) {
              if (e.response?.data?.maLoi === 'VUOT_DINH_BIEN') {
                setVuot({ payload, canhBao: e.response.data.message, dong: modal.dong });
                setModal(null);
                return;
              }
              throw e;
            }
          }}
        />
      )}

      {vuot && (
        <FormModal
          tieuDe="Vượt định biên — cần lý do"
          cacTruong={[{ key: 'lyDoVuotDinhBien', nhan: 'Lý do vượt định biên', type: 'textarea', batBuoc: true, maxLength: 300, goiY: 'Lý do được ghi vào nhật ký thay đổi' }]}
          phanPhu={<ThongBao loai="vang">{vuot.canhBao}</ThongBao>}
          nhanNop="Vẫn thực hiện"
          onDong={() => setVuot(null)}
          onSubmit={(p) => gui(vuot.dong, { ...vuot.payload, xacNhanVuotDinhBien: true, lyDoVuotDinhBien: p.lyDoVuotDinhBien })}
        />
      )}

      {lichSu && <HistoryModal tenBang={tenBang} banGhiId={lichSu.Id} tieuDe={`Lịch sử: ${layTen(lichSu)}`} onDong={() => setLichSu(null)} />}
    </>
  );
}
