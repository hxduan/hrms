import { useEffect, useState } from 'react';
import Modal from './Modal';
import { ManHinhTai, ThongBao } from './ui';
import api from '../api/client';

const TEN_COT = {
  Ten: 'Tên', MaPhongBan: 'Mã', PhongBanChaId: 'Phòng ban cha', ThuTu: 'Thứ tự', PhongBanId: 'Phòng ban',
  ChucDanhId: 'Chức danh', SoLuongDuocDuyet: 'Số lượng duyệt', GhiChu: 'Ghi chú', DaXoa: 'Trạng thái',
  VaiTro: 'Vai trò', NhanVienId: 'Hồ sơ nhân viên', MatKhau: 'Mật khẩu',
};

function hienThiGiaTri(cot, v) {
  if (v === null || v === undefined || v === '') return <em style={{ color: 'var(--chu-mo)' }}>(trống)</em>;
  if (cot === 'DaXoa') return v === '1' ? 'Đã xóa' : 'Đang dùng';
  return v;
}

/** Lịch sử thay đổi của 1 bản ghi — đọc từ bảng NhatKyThayDoi. */
export default function HistoryModal({ tenBang, banGhiId, tieuDe, onDong }) {
  const [dong, setDong] = useState(null);
  const [loi, setLoi] = useState('');

  useEffect(() => {
    let huy = false;
    api
      .get('/nhat-ky-thay-doi', { params: { tenBang, banGhiId } })
      .then((r) => !huy && setDong(r.data))
      .catch((e) => !huy && setLoi(e.response?.data?.message ?? 'Không tải được lịch sử'));
    return () => {
      huy = true;
    };
  }, [tenBang, banGhiId]);

  return (
    <Modal tieuDe={tieuDe ?? 'Lịch sử thay đổi'} onDong={onDong} rong>
      {loi && <ThongBao loai="loi">{loi}</ThongBao>}
      {!loi && dong === null && <ManHinhTai />}
      {dong && dong.length === 0 && <p style={{ color: 'var(--chu-phu)' }}>Chưa có thay đổi nào được ghi nhận.</p>}
      {dong && dong.length > 0 && (
        <div className="hr-bang-boc">
          <table className="hr-bang">
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Người thực hiện</th>
                <th>Trường</th>
                <th>Giá trị cũ</th>
                <th>Giá trị mới</th>
              </tr>
            </thead>
            <tbody>
              {dong.map((d) =>
                d.TenCot === '__XOA__' ? (
                  <tr key={d.Id}>
                    <td>{new Date(d.ThoiGian).toLocaleString('vi-VN')}</td>
                    <td>{d.NguoiThucHien}</td>
                    <td colSpan={3}>
                      <strong>Đã xóa vĩnh viễn bản ghi</strong> <span className="hr-goi-y">{d.GiaTriCu}</span>
                    </td>
                  </tr>
                ) : (
                  <tr key={d.Id}>
                    <td>{new Date(d.ThoiGian).toLocaleString('vi-VN')}</td>
                    <td>{d.NguoiThucHien}</td>
                    <td>{TEN_COT[d.TenCot] ?? d.TenCot}</td>
                    <td className="hr-lich-su-cu">{hienThiGiaTri(d.TenCot, d.GiaTriCu)}</td>
                    <td>{hienThiGiaTri(d.TenCot, d.GiaTriMoi)}</td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
