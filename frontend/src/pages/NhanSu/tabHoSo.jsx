import { useMemo, useState } from 'react';
import api from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/Feedback';
import FormModal from '../../components/FormModal';
import TabDanhSach from '../../components/TabDanhSach';
import { HuyHieu, ManHinhTai, ThongBao } from '../../components/ui';
import useTaiDuLieu from '../../hooks/useTaiDuLieu';
import { congNgay, homNayYMD, ngayVN, tienVN } from '../../utils/chuoi';

const CO_KHONG = (v) => (v ? 'Có' : 'Không');
const caySelect = (ds) => ds.map((p) => ({ value: p.Id, label: `${'\u00A0\u00A0\u00A0'.repeat(p.Cap)}${p.Cap ? '└ ' : ''}${p.Ten}` }));

export const NHAN_LOAI_BIEN_DONG = {
  bo_nhiem: 'Bổ nhiệm', dieu_chuyen: 'Điều chuyển', thang_chuc: 'Thăng chức', giang_chuc: 'Giáng chức', khac: 'Khác (tiếp nhận…)',
};
const TUY_CHON_BIEN_DONG = Object.entries(NHAN_LOAI_BIEN_DONG).map(([value, label]) => ({ value, label }));

// ===========================================================================
// HỢP ĐỒNG
// ===========================================================================
function trangThaiHopDong(h, homNay) {
  if (h.NgayBatDau > homNay) return { loai: 'vang', nhan: 'Chưa hiệu lực' };
  if (h.NgayKetThuc && h.NgayKetThuc < homNay) return { loai: undefined, nhan: 'Đã hết hạn' };
  if (h.NgayKetThuc && h.NgayKetThuc <= congNgay(homNay, 30)) return { loai: 'vang', nhan: 'Sắp hết hạn' };
  return { loai: 'ok', nhan: 'Đang hiệu lực' };
}

export function TabHopDong({ nhanVienId, choPhepSua, onThayDoi }) {
  const loai = useTaiDuLieu('/danh-muc-nhan-su/loai-hop-dong');
  const homNay = homNayYMD();
  const cot = [
    { key: 'SoHopDong', nhan: 'Số hợp đồng', render: (h) => h.SoHopDong ?? <span className="hr-goi-y">—</span> },
    { key: 'TenLoaiHopDong', nhan: 'Loại' },
    { key: 'ThoiHan', nhan: 'Thời hạn', render: (h) => `${ngayVN(h.NgayBatDau)} → ${h.NgayKetThuc ? ngayVN(h.NgayKetThuc) : 'không thời hạn'}` },
    { key: 'LuongCoBan', nhan: 'Lương cơ bản', canPhai: true, render: (h) => tienVN(h.LuongCoBan) },
    { key: 'LuongDongBHXH', nhan: 'Lương đóng BHXH', canPhai: true, an: 'diDong', render: (h) => (h.LuongDongBHXH ? tienVN(h.LuongDongBHXH) : <span className="hr-goi-y">= lương CB</span>) },
    { key: 'TrangThai', nhan: 'Trạng thái', render: (h) => { const t = trangThaiHopDong(h, homNay); return <HuyHieu loai={t.loai}>{t.nhan}</HuyHieu>; } },
  ];
  const cacTruong = [
    { key: 'LoaiHopDongId', nhan: 'Loại hợp đồng', type: 'select', kieuSo: true, batBuoc: true, options: loai.duLieu.map((l) => ({ value: l.Id, label: l.Ten })) },
    { key: 'SoHopDong', nhan: 'Số hợp đồng', maxLength: 50 },
    { key: 'NgayBatDau', nhan: 'Ngày bắt đầu', type: 'date', batBuoc: true },
    { key: 'NgayKetThuc', nhan: 'Ngày kết thúc', type: 'date', goiY: 'Để trống nếu không thời hạn' },
    { key: 'LuongCoBan', nhan: 'Lương cơ bản (đ/tháng)', type: 'number', batBuoc: true, min: 1, buoc: 1000 },
    { key: 'LuongDongBHXH', nhan: 'Lương đóng BHXH (nếu khác)', type: 'number', min: 1, buoc: 1000, goiY: 'Để trống nếu bằng lương cơ bản' },
    { key: 'GhiChu', nhan: 'Ghi chú', type: 'textarea', maxLength: 300, rong: true },
  ];
  return (
    <TabDanhSach
      endpoint={`/nhan-vien/${nhanVienId}/hop-dong`}
      tenBang="HopDong" loai="hợp đồng" nhanThem="Thêm hợp đồng" tieuDeSua="Sửa hợp đồng" rongForm luoi
      cot={cot} cacTruong={cacTruong} choPhepSua={choPhepSua} onThayDoi={onThayDoi}
      layTen={(h) => h.SoHopDong ?? `#${h.Id}`}
      giaTriBanDau={(h) => (h ? { LoaiHopDongId: h.LoaiHopDongId, SoHopDong: h.SoHopDong, NgayBatDau: h.NgayBatDau, NgayKetThuc: h.NgayKetThuc, LuongCoBan: h.LuongCoBan, LuongDongBHXH: h.LuongDongBHXH, GhiChu: h.GhiChu } : {})}
      khongCoDuLieu="Chưa có hợp đồng nào"
      moTa="Mỗi nhân viên chỉ có một hợp đồng hiệu lực tại một thời điểm: hợp đồng mới không được chồng thời gian với hợp đồng cũ."
    />
  );
}

// ===========================================================================
// QUÁ TRÌNH CÔNG TÁC
// ===========================================================================
export function TabQuaTrinh({ nhanVienId, choPhepSua, onThayDoi, hoSo }) {
  const phongBan = useTaiDuLieu('/phong-ban');
  const chucVu = useTaiDuLieu('/chuc-vu');
  const chucDanh = useTaiDuLieu('/chuc-danh');
  const homNay = homNayYMD();

  const cot = (ds) => {
    const hienTai = ds.find((q) => q.NgayHieuLuc <= homNay)?.Id; // danh sách đã sắp mới nhất trước
    return [
      { key: 'NgayHieuLuc', nhan: 'Hiệu lực từ', render: (q) => ngayVN(q.NgayHieuLuc) },
      { key: 'LoaiBienDong', nhan: 'Loại', render: (q) => NHAN_LOAI_BIEN_DONG[q.LoaiBienDong] ?? q.LoaiBienDong },
      { key: 'TenPhongBan', nhan: 'Phòng ban' },
      { key: 'TenChucVu', nhan: 'Chức vụ', an: 'diDong', render: (q) => q.TenChucVu ?? '—' },
      { key: 'TenChucDanh', nhan: 'Chức danh' },
      { key: 'SoQuyetDinh', nhan: 'Số quyết định', an: 'diDong', render: (q) => q.SoQuyetDinh ?? '—' },
      { key: 'TT', nhan: '', render: (q) => (q.Id === hienTai ? <HuyHieu loai="ok">Hiện tại</HuyHieu> : q.NgayHieuLuc > homNay ? <HuyHieu loai="vang">Chờ hiệu lực</HuyHieu> : null) },
    ];
  };
  const cacTruong = [
    { key: 'LoaiBienDong', nhan: 'Loại biến động', type: 'select', batBuoc: true, options: TUY_CHON_BIEN_DONG },
    { key: 'NgayHieuLuc', nhan: 'Ngày hiệu lực', type: 'date', batBuoc: true, goiY: 'Ngày trong tương lai: chưa đổi vị trí hiện tại cho tới ngày đó' },
    { key: 'PhongBanId', nhan: 'Phòng ban', type: 'select', kieuSo: true, batBuoc: true, options: caySelect(phongBan.duLieu) },
    { key: 'ChucVuId', nhan: 'Chức vụ', type: 'select', kieuSo: true, placeholder: '— Không —', options: chucVu.duLieu.map((c) => ({ value: c.Id, label: c.TenPhongBan ? `${c.Ten} (${c.TenPhongBan})` : c.Ten })) },
    { key: 'ChucDanhId', nhan: 'Chức danh', type: 'select', kieuSo: true, batBuoc: true, options: chucDanh.duLieu.map((c) => ({ value: c.Id, label: c.Ten })) },
    { key: 'SoQuyetDinh', nhan: 'Số quyết định', maxLength: 50 },
    { key: 'GhiChu', nhan: 'Ghi chú', type: 'textarea', maxLength: 300, rong: true },
  ];
  return (
    <TabDanhSach
      endpoint={`/nhan-vien/${nhanVienId}/qua-trinh`}
      tenBang="QuaTrinhLamViec" loai="biến động công tác" nhanThem="Thêm biến động" tieuDeSua="Sửa biến động công tác" rongForm luoi
      cot={cot} cacTruong={cacTruong} choPhepSua={choPhepSua} onThayDoi={onThayDoi}
      layTen={(q) => `${NHAN_LOAI_BIEN_DONG[q.LoaiBienDong]} ${ngayVN(q.NgayHieuLuc)}`}
      giaTriBanDau={(q) => (q
        ? { LoaiBienDong: q.LoaiBienDong, NgayHieuLuc: q.NgayHieuLuc, PhongBanId: q.PhongBanId, ChucVuId: q.ChucVuId, ChucDanhId: q.ChucDanhId, SoQuyetDinh: q.SoQuyetDinh, GhiChu: q.GhiChu }
        : { LoaiBienDong: 'dieu_chuyen', NgayHieuLuc: homNay, PhongBanId: hoSo?.PhongBanId ?? '', ChucVuId: hoSo?.ChucVuId ?? '', ChucDanhId: hoSo?.ChucDanhId ?? '' })}
      khongCoDuLieu="Chưa có biến động công tác nào"
      moTa="Vị trí HIỆN TẠI của nhân viên (phòng ban, chức vụ, chức danh) luôn lấy từ bản ghi có hiệu lực mới nhất không quá hôm nay. Muốn đổi vị trí hãy thêm biến động tại đây — hệ thống kiểm tra định biên và lưu lịch sử."
    />
  );
}

// ===========================================================================
// PHỤ CẤP / NGƯỜI PHỤ THUỘC (đầu vào tính lương)
// ===========================================================================
export function TabPhuCap({ nhanVienId, choPhepSua }) {
  const cot = [
    { key: 'TenPhuCap', nhan: 'Phụ cấp' },
    { key: 'SoTien', nhan: 'Số tiền / tháng', canPhai: true, render: (p) => tienVN(p.SoTien) },
    { key: 'TinhBHXH', nhan: 'Tính BHXH', an: 'diDong', render: (p) => CO_KHONG(p.TinhBHXH) },
    { key: 'Thue', nhan: 'Thuế TNCN', an: 'diDong', render: (p) => (!p.TinhThue ? 'Không chịu thuế' : p.MienThueToiDa ? `Miễn đến ${tienVN(p.MienThueToiDa)}` : 'Chịu thuế') },
    { key: 'HieuLuc', nhan: 'Hiệu lực', render: (p) => `${ngayVN(p.NgayHieuLuc)} → ${p.NgayKetThuc ? ngayVN(p.NgayKetThuc) : 'nay'}` },
  ];
  const cacTruong = [
    { key: 'TenPhuCap', nhan: 'Tên phụ cấp', batBuoc: true, maxLength: 200 },
    { key: 'SoTien', nhan: 'Số tiền / tháng (đ)', type: 'number', batBuoc: true, min: 1, buoc: 1000 },
    { key: 'TinhBHXH', nhan: 'Tính vào lương đóng BHXH', type: 'checkbox' },
    { key: 'TinhThue', nhan: 'Chịu thuế TNCN', type: 'checkbox' },
    { key: 'MienThueToiDa', nhan: 'Phần miễn thuế tối đa / tháng (đ)', type: 'number', min: 0, buoc: 1000, goiY: 'Chỉ dùng cho khoản có mức miễn thuế riêng (VD tiền ăn) — hãy xác nhận mức với kế toán' },
    { key: 'NgayHieuLuc', nhan: 'Hiệu lực từ', type: 'date', batBuoc: true },
    { key: 'NgayKetThuc', nhan: 'Đến ngày', type: 'date', goiY: 'Để trống nếu còn hiệu lực' },
  ];
  return (
    <TabDanhSach
      endpoint={`/nhan-vien/${nhanVienId}/phu-cap`}
      tenBang="PhuCapNhanVien" loai="phụ cấp" nhanThem="Thêm phụ cấp" tieuDeSua="Sửa phụ cấp" luoi rongForm
      cot={cot} cacTruong={cacTruong} choPhepSua={choPhepSua} layTen={(p) => p.TenPhuCap}
      giaTriBanDau={(p) => (p ? { TenPhuCap: p.TenPhuCap, SoTien: p.SoTien, TinhBHXH: !!p.TinhBHXH, TinhThue: !!p.TinhThue, MienThueToiDa: p.MienThueToiDa, NgayHieuLuc: p.NgayHieuLuc, NgayKetThuc: p.NgayKetThuc } : { TinhThue: true, NgayHieuLuc: homNayYMD() })}
      khongCoDuLieu="Chưa có phụ cấp nào"
    />
  );
}

export function TabNguoiPhuThuoc({ nhanVienId, choPhepSua }) {
  const cot = [
    { key: 'HoTen', nhan: 'Họ tên' },
    { key: 'QuanHe', nhan: 'Quan hệ', render: (n) => n.QuanHe ?? '—' },
    { key: 'NgaySinh', nhan: 'Ngày sinh', an: 'diDong', render: (n) => ngayVN(n.NgaySinh) },
    { key: 'MaSoThue', nhan: 'MST / CCCD', an: 'diDong', render: (n) => n.MaSoThue ?? n.SoCCCD ?? '—' },
    { key: 'GiamTru', nhan: 'Giảm trừ', render: (n) => `${ngayVN(n.NgayBatDauTinhGiamTru)} → ${n.NgayKetThucTinhGiamTru ? ngayVN(n.NgayKetThucTinhGiamTru) : 'nay'}` },
  ];
  const cacTruong = [
    { key: 'HoTen', nhan: 'Họ tên', batBuoc: true, maxLength: 200 },
    { key: 'QuanHe', nhan: 'Quan hệ', maxLength: 50, placeholder: 'VD: Con, Vợ/Chồng, Cha/Mẹ' },
    { key: 'NgaySinh', nhan: 'Ngày sinh', type: 'date', max: homNayYMD() },
    { key: 'MaSoThue', nhan: 'Mã số thuế', maxLength: 15 },
    { key: 'SoCCCD', nhan: 'Số CCCD / CMND', maxLength: 20 },
    { key: 'NgayBatDauTinhGiamTru', nhan: 'Bắt đầu tính giảm trừ', type: 'date', batBuoc: true },
    { key: 'NgayKetThucTinhGiamTru', nhan: 'Kết thúc giảm trừ', type: 'date', goiY: 'Để trống nếu còn phụ thuộc' },
  ];
  return (
    <TabDanhSach
      endpoint={`/nhan-vien/${nhanVienId}/nguoi-phu-thuoc`}
      tenBang="NguoiPhuThuocNhanVien" loai="người phụ thuộc" nhanThem="Thêm người phụ thuộc" tieuDeSua="Sửa người phụ thuộc" luoi rongForm
      cot={cot} cacTruong={cacTruong} choPhepSua={choPhepSua} layTen={(n) => n.HoTen}
      giaTriBanDau={(n) => (n ? { HoTen: n.HoTen, QuanHe: n.QuanHe, NgaySinh: n.NgaySinh, MaSoThue: n.MaSoThue, SoCCCD: n.SoCCCD, NgayBatDauTinhGiamTru: n.NgayBatDauTinhGiamTru, NgayKetThucTinhGiamTru: n.NgayKetThucTinhGiamTru } : { NgayBatDauTinhGiamTru: homNayYMD() })}
      khongCoDuLieu="Chưa có người phụ thuộc nào"
      moTa="Số người phụ thuộc đang trong thời gian giảm trừ được dùng để tính thuế TNCN ở bước tính lương."
    />
  );
}

// ===========================================================================
// NGHỈ VIỆC
// ===========================================================================
export function TabNghiViec({ nhanVienId, choPhepSua, dangLamViec, onThayDoi }) {
  const { coVaiTro } = useAuth();
  const toast = useToast();
  const lyDo = useTaiDuLieu('/danh-muc-nhan-su/ly-do-nghi-viec');
  const { duLieu: qd, dangTai, loi, taiLai } = useTaiDuLieu(`/nhan-vien/${nhanVienId}/nghi-viec`, undefined, { khoiTao: null });
  const [modal, setModal] = useState(null); // 'them' | 'huy'
  const homNay = homNayYMD();

  const xong = (msg) => {
    toast.thanhCong(msg);
    setModal(null);
    taiLai();
    onThayDoi?.();
  };

  if (dangTai) return <ManHinhTai />;
  return (
    <>
      {loi && <ThongBao loai="loi">{loi}</ThongBao>}
      {qd ? (
        <div className="hr-the hr-the-than">
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0 }}>Quyết định nghỉ việc</h3>
            <HuyHieu loai={qd.NgayNghiViec <= homNay ? 'do' : 'vang'}>{qd.NgayNghiViec <= homNay ? 'Đã có hiệu lực' : `Có hiệu lực từ ${ngayVN(qd.NgayNghiViec)}`}</HuyHieu>
          </div>
          <dl className="hr-danh-sach-info">
            <dt>Lý do</dt><dd>{qd.TenLyDo ?? '—'}</dd>
            <dt>Ngày nghỉ việc</dt><dd>{ngayVN(qd.NgayNghiViec)}</dd>
            <dt>Ngày làm việc cuối</dt><dd>{ngayVN(qd.NgayLamViecCuoi)}</dd>
            <dt>Khóa tài khoản</dt><dd>{qd.KhoaTaiKhoan ? 'Có — tự khóa khi tới ngày nghỉ việc' : 'Không'}</dd>
            <dt>Ghi chú</dt><dd>{qd.GhiChu ?? '—'}</dd>
          </dl>
          {coVaiTro('admin') && (
            <div style={{ marginTop: 16 }}>
              <button type="button" className="hr-btn hr-btn-vien-nguy-hiem" onClick={() => setModal('huy')}>Hủy quyết định nghỉ việc</button>
            </div>
          )}
        </div>
      ) : (
        <div className="hr-the hr-the-than">
          <p style={{ marginTop: 0 }}>{dangLamViec ? 'Nhân viên đang làm việc, chưa có quyết định nghỉ việc.' : 'Nhân viên đã nghỉ việc.'}</p>
          {choPhepSua && dangLamViec && (
            <button type="button" className="hr-btn hr-btn-vien-nguy-hiem" onClick={() => setModal('them')}>Cho nghỉ việc</button>
          )}
        </div>
      )}

      {modal === 'them' && (
        <FormModal
          tieuDe="Cho nghỉ việc"
          cacTruong={[
            { key: 'LyDoNghiViecId', nhan: 'Lý do nghỉ việc', type: 'select', kieuSo: true, batBuoc: true, options: lyDo.duLieu.map((l) => ({ value: l.Id, label: l.Ten })) },
            { key: 'NgayNghiViec', nhan: 'Ngày nghỉ việc', type: 'date', batBuoc: true },
            { key: 'NgayLamViecCuoi', nhan: 'Ngày làm việc cuối', type: 'date' },
            { key: 'GhiChu', nhan: 'Ghi chú', type: 'textarea', maxLength: 300 },
            { key: 'KhoaTaiKhoan', nhan: 'Khóa tài khoản đăng nhập khi tới ngày nghỉ việc', type: 'checkbox' },
          ]}
          giaTriBanDau={{ NgayNghiViec: homNay, KhoaTaiKhoan: true }}
          nhanNop="Xác nhận nghỉ việc"
          onDong={() => setModal(null)}
          onSubmit={async (p) => {
            await api.post(`/nhan-vien/${nhanVienId}/nghi-viec`, p);
            xong('Đã ghi nhận nghỉ việc');
          }}
        />
      )}
      {modal === 'huy' && (
        <FormModal
          tieuDe="Hủy quyết định nghỉ việc"
          cacTruong={[{ key: 'lyDo', nhan: 'Lý do hủy', type: 'textarea', batBuoc: true, maxLength: 300, goiY: 'Ghi lại nhật ký. Tài khoản đã bị khóa (nếu có) cần được mở khóa thủ công.' }]}
          nhanNop="Hủy quyết định"
          onDong={() => setModal(null)}
          onSubmit={async (p) => {
            const r = await api.delete(`/nhan-vien/${nhanVienId}/nghi-viec`, { data: p });
            xong(r.data.message);
          }}
        />
      )}
    </>
  );
}

// ===========================================================================
// TỔNG QUAN
// ===========================================================================
const VUNG = { 1: 'Vùng I', 2: 'Vùng II', 3: 'Vùng III', 4: 'Vùng IV' };

function Nhom({ tieuDe, children }) {
  return (
    <section className="hr-nhom-thong-tin">
      <h3>{tieuDe}</h3>
      <dl className="hr-danh-sach-info">{children}</dl>
    </section>
  );
}
const Dong = ({ nhan, children }) => (
  <>
    <dt>{nhan}</dt>
    <dd>{children === null || children === undefined || children === '' ? <span className="hr-goi-y">—</span> : children}</dd>
  </>
);

export function TabTongQuan({ hoSo }) {
  const diaChi = useMemo(() => [hoSo.DiaChiChiTiet, hoSo.PhuongXa, hoSo.Tinh].filter(Boolean).join(', '), [hoSo]);
  return (
    <div className="hr-the hr-the-than">
      <Nhom tieuDe="Thông tin cá nhân">
        <Dong nhan="Họ tên">{hoSo.HoTen}</Dong>
        <Dong nhan="Giới tính">{hoSo.GioiTinh}</Dong>
        <Dong nhan="Ngày sinh">{hoSo.NgaySinh ? ngayVN(hoSo.NgaySinh) : null}</Dong>
        <Dong nhan="Số CCCD">{hoSo.SoCCCD}</Dong>
      </Nhom>
      <Nhom tieuDe="Liên hệ">
        <Dong nhan="Điện thoại">{hoSo.SoDienThoai}</Dong>
        <Dong nhan="Email">{hoSo.Email}</Dong>
        <Dong nhan="Địa chỉ">{diaChi}</Dong>
      </Nhom>
      <Nhom tieuDe="Công việc hiện tại">
        <Dong nhan="Phòng ban">{hoSo.TenPhongBan}</Dong>
        <Dong nhan="Chức vụ">{hoSo.TenChucVu}</Dong>
        <Dong nhan="Chức danh">{hoSo.TenChucDanh}</Dong>
        <Dong nhan="Ngày vào làm">{hoSo.NgayVaoLam ? ngayVN(hoSo.NgayVaoLam) : null}</Dong>
        <Dong nhan="Trạng thái"><HuyHieu loai={hoSo.DangLamViec ? 'ok' : 'do'}>{hoSo.DangLamViec ? 'Đang làm việc' : 'Đã nghỉ việc'}</HuyHieu></Dong>
      </Nhom>
      <Nhom tieuDe="Bảo hiểm, thuế & ngân hàng">
        <Dong nhan="Số sổ BHXH">{hoSo.SoSoBHXH}</Dong>
        <Dong nhan="Mã số thuế">{hoSo.MaSoThue}</Dong>
        <Dong nhan="Vùng lương tối thiểu">{VUNG[hoSo.VungLuong]}</Dong>
        <Dong nhan="Ngân hàng">{[hoSo.TenNganHang, hoSo.SoTaiKhoanNganHang].filter(Boolean).join(' — ')}</Dong>
      </Nhom>
      <Nhom tieuDe="Tài khoản đăng nhập">
        <Dong nhan="Tên đăng nhập">{hoSo.TaiKhoanId ? hoSo.TenDangNhap ?? 'Đăng nhập bằng Google' : null}</Dong>
        <Dong nhan="Trạng thái">
          {!hoSo.TaiKhoanId ? <HuyHieu loai="vang">Chưa có tài khoản</HuyHieu> : <HuyHieu loai={hoSo.TaiKhoanHoatDong ? 'ok' : 'do'}>{hoSo.TaiKhoanHoatDong ? 'Đang hoạt động' : 'Đã khóa'}</HuyHieu>}
        </Dong>
      </Nhom>
    </div>
  );
}
