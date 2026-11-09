const {
  NhanVienSchema, NhanVienSuaSchema, HopDongSchema, QuaTrinhSchema, NghiViecSchema, PhuCapSchema, NguoiPhuThuocSchema,
  LoaiHopDongSchema, ngayHopLe, congNam, duTuoiTai,
} = require('../src/validation/nhanSu');

const loi = (kq, truong) => kq.error?.issues.find((i) => i.path[0] === truong)?.message;
const co = { HoTen: ' Nguyễn Văn An ', PhongBanId: '3', ChucDanhId: 7, NgayVaoLam: '2026-03-01' };

describe('Tiện ích ngày', () => {
  test('ngayHopLe: bắt ngày không tồn tại, nhận 29/02 năm nhuận', () => {
    expect(ngayHopLe('2026-02-30')).toBe(false);
    expect(ngayHopLe('2026-13-01')).toBe(false);
    expect(ngayHopLe('01/02/2026')).toBe(false);
    expect(ngayHopLe('2024-02-29')).toBe(true);
    expect(ngayHopLe('2026-02-29')).toBe(false);
  });
  test('congNam và duTuoiTai xử lý đúng sinh nhật 29/02', () => {
    expect(congNam('2008-02-29', 15)).toBe('2023-03-01');
    expect(duTuoiTai('2008-02-29', '2023-02-28', 15)).toBe(false);
    expect(duTuoiTai('2008-02-29', '2023-03-01', 15)).toBe(true);
    expect(duTuoiTai('2000-06-15', '2026-03-01', 15)).toBe(true);
  });
});

describe('NhanVienSchema', () => {
  test('tối thiểu hợp lệ: cắt khoảng trắng, ô tùy chọn thành null, VungLuong mặc định 1, ép kiểu id', () => {
    const kq = NhanVienSchema.safeParse(co);
    expect(kq.success).toBe(true);
    expect(kq.data.HoTen).toBe('Nguyễn Văn An');
    expect(kq.data.PhongBanId).toBe(3);
    expect(kq.data.SoCCCD).toBeNull();
    expect(kq.data.Email).toBeNull();
    expect(kq.data.VungLuong).toBe(1);
    expect(kq.data.xacNhanVuotDinhBien).toBe(false);
  });
  test('CCCD đúng 12 số; SĐT di động VN; BHXH 10 số; MST 10 hoặc 13 số', () => {
    const t = (truong, v) => NhanVienSchema.safeParse({ ...co, [truong]: v }).success;
    expect(t('SoCCCD', '001090000001')).toBe(true);
    expect(t('SoCCCD', '00109000000')).toBe(false);
    expect(t('SoCCCD', '00109000000a')).toBe(false);
    expect(t('SoDienThoai', '0912345678')).toBe(true);
    expect(t('SoDienThoai', '+84912345678')).toBe(true);
    expect(t('SoDienThoai', '912345678')).toBe(false);
    expect(t('SoSoBHXH', '0123456789')).toBe(true);
    expect(t('SoSoBHXH', '12345')).toBe(false);
    expect(t('MaSoThue', '0123456789')).toBe(true);
    expect(t('MaSoThue', '0123456789-001')).toBe(true);
    expect(t('MaSoThue', '01234567')).toBe(false);
  });
  test('email về chữ thường; chuỗi rỗng ở ô tùy chọn = null; giới tính ngoài danh sách bị từ chối', () => {
    expect(NhanVienSchema.safeParse({ ...co, Email: ' A@B.VN ' }).data.Email).toBe('a@b.vn');
    expect(NhanVienSchema.safeParse({ ...co, Email: '', SoCCCD: '', GioiTinh: '' }).data.Email).toBeNull();
    expect(NhanVienSchema.safeParse({ ...co, GioiTinh: 'X' }).success).toBe(false);
  });
  test('bắt buộc: họ tên, phòng ban, chức danh, ngày vào làm; vùng lương 1–4', () => {
    expect(NhanVienSchema.safeParse({ ...co, HoTen: '  ' }).success).toBe(false);
    expect(NhanVienSchema.safeParse({ ...co, PhongBanId: '' }).success).toBe(false);
    expect(NhanVienSchema.safeParse({ ...co, ChucDanhId: undefined }).success).toBe(false);
    expect(NhanVienSchema.safeParse({ ...co, NgayVaoLam: undefined }).success).toBe(false);
    expect(NhanVienSchema.safeParse({ ...co, VungLuong: 5 }).success).toBe(false);
    expect(NhanVienSchema.safeParse({ ...co, VungLuong: '3' }).data.VungLuong).toBe(3);
  });
  test('tuổi: phải đủ 15 tuổi tại ngày vào làm; ngày sinh không ở tương lai', () => {
    expect(loi(NhanVienSchema.safeParse({ ...co, NgaySinh: '2015-01-01' }), 'NgayVaoLam')).toMatch(/15 tuổi/);
    expect(NhanVienSchema.safeParse({ ...co, NgaySinh: '2000-01-01' }).success).toBe(true);
    expect(loi(NhanVienSchema.safeParse({ ...co, NgaySinh: '2999-01-01' }), 'NgaySinh')).toMatch(/tương lai/);
  });
  test('vượt định biên: xác nhận thì bắt buộc có lý do', () => {
    expect(loi(NhanVienSchema.safeParse({ ...co, xacNhanVuotDinhBien: true }), 'lyDoVuotDinhBien')).toMatch(/lý do/);
    expect(NhanVienSchema.safeParse({ ...co, xacNhanVuotDinhBien: true, lyDoVuotDinhBien: 'Dự án gấp' }).success).toBe(true);
  });
});

describe('NhanVienSuaSchema', () => {
  test('không yêu cầu và không nhận phòng ban/chức vụ/chức danh (phải đổi qua Quá trình công tác)', () => {
    const kq = NhanVienSuaSchema.safeParse({ HoTen: 'A', NgayVaoLam: '2026-03-01', PhongBanId: 9, ChucDanhId: 9 });
    expect(kq.success).toBe(true);
    expect('PhongBanId' in kq.data).toBe(false);
    expect('ChucDanhId' in kq.data).toBe(false);
  });
});

describe('HopDongSchema', () => {
  const hd = { LoaiHopDongId: '2', NgayBatDau: '2026-03-01', LuongCoBan: '20000000' };
  test('hợp lệ: ép số, ngày kết thúc rỗng = không thời hạn', () => {
    const kq = HopDongSchema.safeParse({ ...hd, NgayKetThuc: '' });
    expect(kq.success).toBe(true);
    expect(kq.data.LuongCoBan).toBe(20000000);
    expect(kq.data.NgayKetThuc).toBeNull();
    expect(kq.data.LuongDongBHXH).toBeNull();
  });
  test('từ chối: kết thúc trước bắt đầu, lương 0 / âm / quá lớn', () => {
    expect(loi(HopDongSchema.safeParse({ ...hd, NgayKetThuc: '2026-02-28' }), 'NgayKetThuc')).toMatch(/sau hoặc bằng/);
    expect(HopDongSchema.safeParse({ ...hd, NgayKetThuc: '2026-03-01' }).success).toBe(true);
    expect(HopDongSchema.safeParse({ ...hd, LuongCoBan: 0 }).success).toBe(false);
    expect(HopDongSchema.safeParse({ ...hd, LuongCoBan: -5 }).success).toBe(false);
    expect(HopDongSchema.safeParse({ ...hd, LuongCoBan: 1e12 }).success).toBe(false);
    expect(HopDongSchema.safeParse({ ...hd, LoaiHopDongId: '' }).success).toBe(false);
  });
});

describe('QuaTrinhSchema / NghiViecSchema', () => {
  test('quá trình: loại biến động phải thuộc danh sách', () => {
    const q = { LoaiBienDong: 'dieu_chuyen', NgayHieuLuc: '2026-04-01', PhongBanId: 2, ChucDanhId: 3 };
    expect(QuaTrinhSchema.safeParse(q).success).toBe(true);
    expect(QuaTrinhSchema.safeParse({ ...q, LoaiBienDong: 'an_bay' }).success).toBe(false);
  });
  test('nghỉ việc: ngày làm việc cuối không được sau ngày nghỉ; mặc định khóa tài khoản', () => {
    const n = { LyDoNghiViecId: 1, NgayNghiViec: '2026-06-30' };
    expect(NghiViecSchema.safeParse(n).data.KhoaTaiKhoan).toBe(true);
    expect(NghiViecSchema.safeParse({ ...n, KhoaTaiKhoan: 'false' }).data.KhoaTaiKhoan).toBe(false);
    expect(NghiViecSchema.safeParse({ ...n, NgayLamViecCuoi: '2026-07-02' }).success).toBe(false);
    expect(NghiViecSchema.safeParse({ ...n, NgayLamViecCuoi: '2026-06-29' }).success).toBe(true);
  });
});

describe('PhuCapSchema / NguoiPhuThuocSchema / LoaiHopDongSchema', () => {
  test('phụ cấp: mặc định chịu thuế, không tính BHXH; miễn thuế rỗng = null; không âm', () => {
    const kq = PhuCapSchema.safeParse({ TenPhuCap: 'Ăn trưa', SoTien: '1000000', NgayHieuLuc: '2026-01-01', MienThueToiDa: '' });
    expect(kq.success).toBe(true);
    expect(kq.data.TinhThue).toBe(true);
    expect(kq.data.TinhBHXH).toBe(false);
    expect(kq.data.MienThueToiDa).toBeNull();
    expect(PhuCapSchema.safeParse({ TenPhuCap: 'x', SoTien: 5, NgayHieuLuc: '2026-01-01', MienThueToiDa: -1 }).success).toBe(false);
    expect(PhuCapSchema.safeParse({ TenPhuCap: 'x', SoTien: 0, NgayHieuLuc: '2026-01-01' }).success).toBe(false);
  });
  test('người phụ thuộc: CCCD/CMND 9 hoặc 12 số; kết thúc không trước bắt đầu', () => {
    const p = { HoTen: 'Con A', NgayBatDauTinhGiamTru: '2026-01-01' };
    expect(NguoiPhuThuocSchema.safeParse({ ...p, SoCCCD: '123456789' }).success).toBe(true);
    expect(NguoiPhuThuocSchema.safeParse({ ...p, SoCCCD: '12345678' }).success).toBe(false);
    expect(NguoiPhuThuocSchema.safeParse({ ...p, NgayKetThucTinhGiamTru: '2025-12-31' }).success).toBe(false);
  });
  test('loại hợp đồng: mặc định có đóng bảo hiểm + thuế lũy tiến; cách tính thuế lạ bị từ chối', () => {
    const kq = LoaiHopDongSchema.safeParse({ Ten: 'Xác định thời hạn' });
    expect(kq.data.CoDongBaoHiem).toBe(true);
    expect(kq.data.KieuTinhThue).toBe('luy_tien');
    expect(LoaiHopDongSchema.safeParse({ Ten: 'x', KieuTinhThue: 'khac' }).success).toBe(false);
    expect(LoaiHopDongSchema.safeParse({ Ten: '  ' }).success).toBe(false);
  });
});
