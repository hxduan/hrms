import api from '../api/client';
import { useToast, useXacNhan } from '../components/Feedback';

/**
 * Xử lý xóa 1 và xóa nhiều dùng chung cho các màn hình danh sách.
 *   const { xoaMot, xoaNhieu } = useXoa({ endpoint: '/chuc-vu', loai: 'chức vụ', layTen: (d) => d.Ten, taiLai });
 * Backend trả 409 kèm lý do khi không xóa được (VD còn nhân viên) — hiển thị nguyên văn cho người dùng.
 */
export default function useXoa({ endpoint, loai, layTen, taiLai, xoaVinhVien = false, layId = (d) => d.Id }) {
  const toast = useToast();
  const xacNhan = useXacNhan();

  const ghiChu = xoaVinhVien
    ? 'Dữ liệu sẽ bị xóa vĩnh viễn (nội dung vẫn được lưu trong lịch sử thay đổi).'
    : 'Dữ liệu được ẩn khỏi danh sách (xóa mềm) và vẫn truy vết được trong lịch sử thay đổi.';

  async function xoaMot(dong) {
    const dongY = await xacNhan({
      tieuDe: `Xóa ${loai}`,
      noiDung: (
        <>
          <p style={{ margin: '0 0 8px' }}>
            Bạn có chắc muốn xóa {loai} <strong>{layTen(dong)}</strong>?
          </p>
          <p className="hr-goi-y" style={{ margin: 0 }}>
            {ghiChu}
          </p>
        </>
      ),
      nutXacNhan: 'Xóa',
      nguyHiem: true,
    });
    if (!dongY) return;
    try {
      const r = await api.delete(`${endpoint}/${layId(dong)}`);
      toast.thanhCong(r.data.message ?? 'Đã xóa');
      taiLai();
    } catch (e) {
      toast.loi(e.response?.data?.message ?? 'Không xóa được, vui lòng thử lại');
    }
  }

  async function hienKetQua(kq) {
    if (kq.daXoa?.length) toast.thanhCong(`Đã xóa ${kq.daXoa.length} ${loai}`);
    if (kq.khongXoaDuoc?.length) {
      await xacNhan({
        tieuDe: `${kq.khongXoaDuoc.length} mục không xóa được`,
        noiDung: (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {kq.khongXoaDuoc.map((m) => (
              <li key={m.id} style={{ marginBottom: 6 }}>
                <strong>{m.ten ?? `#${m.id}`}</strong>: {m.lyDo}
              </li>
            ))}
          </ul>
        ),
        nutXacNhan: 'Đã hiểu',
        nutHuy: null,
      });
    }
    taiLai();
  }

  async function xoaNhieu(ids, cacDong) {
    const xemTruoc = cacDong.slice(0, 5).map(layTen);
    const dongY = await xacNhan({
      tieuDe: `Xóa ${ids.length} ${loai}`,
      noiDung: (
        <>
          <p style={{ margin: '0 0 8px' }}>Bạn có chắc muốn xóa {ids.length} mục đã chọn?</p>
          <ul style={{ margin: '0 0 8px', paddingLeft: 18 }}>
            {xemTruoc.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
            {ids.length > 5 && <li>… và {ids.length - 5} mục khác</li>}
          </ul>
          <p className="hr-goi-y" style={{ margin: 0 }}>
            {ghiChu}
          </p>
        </>
      ),
      nutXacNhan: `Xóa ${ids.length} mục`,
      nguyHiem: true,
    });
    if (!dongY) return;
    try {
      const r = await api.post(`${endpoint}/xoa-nhieu`, { ids });
      await hienKetQua(r.data);
    } catch (e) {
      if (e.response?.status === 409 && e.response.data?.khongXoaDuoc) await hienKetQua(e.response.data);
      else toast.loi(e.response?.data?.message ?? 'Không xóa được, vui lòng thử lại');
    }
  }

  return { xoaMot, xoaNhieu };
}
