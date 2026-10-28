const {
  PhongBanSchema,
  ChucVuSchema,
  ChucDanhSchema,
  DinhBienTaoSchema,
  DinhBienSuaSchema,
} = require('../src/validation/toChuc');

const loiCua = (kq, truong) => kq.error.issues.find((i) => i.path[0] === truong)?.message;

describe('PhongBanSchema', () => {
  test('hợp lệ tối thiểu: chỉ có Ten, các trường tùy chọn thành null, ThuTu mặc định 0', () => {
    const kq = PhongBanSchema.safeParse({ Ten: '  Phòng Kỹ thuật  ' });
    expect(kq.success).toBe(true);
    expect(kq.data).toEqual({ Ten: 'Phòng Kỹ thuật', MaPhongBan: null, PhongBanChaId: null, ThuTu: 0 });
  });

  test('chuỗi rỗng ở ô tùy chọn được hiểu là null (form gửi lên "" thay vì null)', () => {
    const kq = PhongBanSchema.safeParse({ Ten: 'A', MaPhongBan: '', PhongBanChaId: '', ThuTu: '5' });
    expect(kq.success).toBe(true);
    expect(kq.data.MaPhongBan).toBeNull();
    expect(kq.data.PhongBanChaId).toBeNull();
    expect(kq.data.ThuTu).toBe(5);
  });

  test('PhongBanChaId dạng chuỗi số được ép về số', () => {
    const kq = PhongBanSchema.safeParse({ Ten: 'A', PhongBanChaId: '12' });
    expect(kq.data.PhongBanChaId).toBe(12);
  });

  test('từ chối tên rỗng / chỉ toàn khoảng trắng', () => {
    expect(PhongBanSchema.safeParse({ Ten: '   ' }).success).toBe(false);
    expect(PhongBanSchema.safeParse({}).success).toBe(false);
  });

  test('từ chối mã có dấu cách hoặc ký tự có dấu', () => {
    const kq = PhongBanSchema.safeParse({ Ten: 'A', MaPhongBan: 'PB 01' });
    expect(kq.success).toBe(false);
    expect(loiCua(kq, 'MaPhongBan')).toMatch(/chữ không dấu/);
  });

  test('từ chối PhongBanChaId = 0 hoặc âm, và ThuTu ngoài 0..9999', () => {
    expect(PhongBanSchema.safeParse({ Ten: 'A', PhongBanChaId: 0 }).success).toBe(false);
    expect(PhongBanSchema.safeParse({ Ten: 'A', PhongBanChaId: -3 }).success).toBe(false);
    expect(PhongBanSchema.safeParse({ Ten: 'A', ThuTu: 10000 }).success).toBe(false);
    expect(PhongBanSchema.safeParse({ Ten: 'A', ThuTu: -1 }).success).toBe(false);
  });
});

describe('ChucVuSchema / ChucDanhSchema', () => {
  test('ChucVu: PhongBanId rỗng = dùng chung toàn công ty (null)', () => {
    const kq = ChucVuSchema.safeParse({ Ten: 'Trưởng phòng', PhongBanId: '' });
    expect(kq.success).toBe(true);
    expect(kq.data.PhongBanId).toBeNull();
  });

  test('ChucDanh: bắt buộc có tên', () => {
    expect(ChucDanhSchema.safeParse({ Ten: 'Kỹ sư phần mềm' }).success).toBe(true);
    expect(ChucDanhSchema.safeParse({ Ten: '' }).success).toBe(false);
  });
});

describe('DinhBienTaoSchema / DinhBienSuaSchema', () => {
  const hopLe = { PhongBanId: '3', ChucDanhId: 7, Nam: '2026', SoLuongDuocDuyet: '5' };

  test('ép kiểu chuỗi số từ form', () => {
    const kq = DinhBienTaoSchema.safeParse(hopLe);
    expect(kq.success).toBe(true);
    expect(kq.data).toEqual({ PhongBanId: 3, ChucDanhId: 7, Nam: 2026, SoLuongDuocDuyet: 5, GhiChu: null });
  });

  test('chưa chọn phòng ban (chuỗi rỗng) phải báo lỗi chứ không bị hiểu thành 0', () => {
    const kq = DinhBienTaoSchema.safeParse({ ...hopLe, PhongBanId: '' });
    expect(kq.success).toBe(false);
    expect(loiCua(kq, 'PhongBanId')).toMatch(/chọn phòng ban/);
  });

  test('từ chối số lượng âm, số lẻ, năm vô lý', () => {
    expect(DinhBienTaoSchema.safeParse({ ...hopLe, SoLuongDuocDuyet: -1 }).success).toBe(false);
    expect(DinhBienTaoSchema.safeParse({ ...hopLe, SoLuongDuocDuyet: 2.5 }).success).toBe(false);
    expect(DinhBienTaoSchema.safeParse({ ...hopLe, Nam: 1999 }).success).toBe(false);
    expect(DinhBienTaoSchema.safeParse({ ...hopLe, Nam: 2101 }).success).toBe(false);
  });

  test('DinhBienSuaSchema bỏ qua phòng ban/chức danh/năm (không cho sửa)', () => {
    const kq = DinhBienSuaSchema.safeParse({ ...hopLe, GhiChu: ' tăng quý 3 ' });
    expect(kq.success).toBe(true);
    expect(Object.keys(kq.data).sort()).toEqual(['GhiChu', 'SoLuongDuocDuyet']);
    expect(kq.data.GhiChu).toBe('tăng quý 3');
  });
});
