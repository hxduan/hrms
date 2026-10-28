const {
  TaoTaiKhoanSchema,
  DoiMatKhauSchema,
  DatLaiMatKhauSchema,
  DoiVaiTroSchema,
  GanNhanVienSchema,
  AdminDatLaiMatKhauSchema,
  TrangThaiTaiKhoanSchema,
} = require('../src/validation/taiKhoan');

describe('Chính sách mật khẩu (tạo tài khoản, đổi, đặt lại)', () => {
  const co = (matKhau) => TaoTaiKhoanSchema.safeParse({ tenDangNhap: 'abc', email: 'a@b.vn', matKhau });

  test('chấp nhận mật khẩu đủ mạnh', () => {
    expect(co('Matkhau123').success).toBe(true);
  });
  test('từ chối <8 ký tự, thiếu chữ, thiếu số, >72 ký tự', () => {
    expect(co('Ab1').success).toBe(false);
    expect(co('12345678').success).toBe(false);
    expect(co('abcdefgh').success).toBe(false);
    expect(co('a1' + 'x'.repeat(80)).success).toBe(false);
  });
  test('DatLaiMatKhauSchema và AdminDatLaiMatKhauSchema áp dụng cùng chính sách', () => {
    expect(DatLaiMatKhauSchema.safeParse({ ma: 'x', matKhauMoi: 'yeu' }).success).toBe(false);
    expect(DatLaiMatKhauSchema.safeParse({ ma: 'x', matKhauMoi: 'Manh1234' }).success).toBe(true);
    expect(AdminDatLaiMatKhauSchema.safeParse({ matKhauMoi: 'yeu' }).success).toBe(false);
    expect(AdminDatLaiMatKhauSchema.safeParse({ matKhauMoi: 'Manh1234' }).success).toBe(true);
  });
});

describe('TaoTaiKhoanSchema (admin/HR tạo)', () => {
  const co = { tenDangNhap: 'nv02', email: 'nv02@x.vn', matKhau: 'Matkhau123' };
  test('vaiTro mặc định nhan_vien, nhanVienId mặc định null', () => {
    const kq = TaoTaiKhoanSchema.safeParse(co);
    expect(kq.data.vaiTro).toBe('nhan_vien');
    expect(kq.data.nhanVienId).toBeNull();
  });
  test('email được đưa về chữ thường và cắt khoảng trắng', () => {
    const kq = TaoTaiKhoanSchema.safeParse({ ...co, email: '  User@Mail.COM ' });
    expect(kq.data.email).toBe('user@mail.com');
  });
  test('từ chối tên đăng nhập có dấu cách / tiếng Việt có dấu / quá ngắn', () => {
    const t = (tenDangNhap) => TaoTaiKhoanSchema.safeParse({ ...co, tenDangNhap }).success;
    expect(t('nguyen van a')).toBe(false);
    expect(t('nguyễn')).toBe(false);
    expect(t('ab')).toBe(false);
  });
  test('từ chối email sai định dạng và vai trò lạ', () => {
    expect(TaoTaiKhoanSchema.safeParse({ ...co, email: 'khong-phai-email' }).success).toBe(false);
    expect(TaoTaiKhoanSchema.safeParse({ ...co, vaiTro: 'superadmin' }).success).toBe(false);
  });
});

describe('Các schema còn lại', () => {
  test('đổi mật khẩu: mới phải khác hiện tại', () => {
    const kq = DoiMatKhauSchema.safeParse({ matKhauHienTai: 'Matkhau123', matKhauMoi: 'Matkhau123' });
    expect(kq.success).toBe(false);
    expect(kq.error.issues[0].path).toEqual(['matKhauMoi']);
    expect(DoiMatKhauSchema.safeParse({ matKhauHienTai: 'Matkhau123', matKhauMoi: 'Matkhau456' }).success).toBe(true);
  });
  test('đổi vai trò chỉ nhận 3 vai trò hợp lệ', () => {
    expect(DoiVaiTroSchema.safeParse({ vaiTro: 'hr' }).success).toBe(true);
    expect(DoiVaiTroSchema.safeParse({ vaiTro: 'root' }).success).toBe(false);
  });
  test('gắn nhân viên: null / rỗng = gỡ liên kết; số = gắn', () => {
    expect(GanNhanVienSchema.safeParse({ nhanVienId: null }).data.nhanVienId).toBeNull();
    expect(GanNhanVienSchema.safeParse({ nhanVienId: '' }).data.nhanVienId).toBeNull();
    expect(GanNhanVienSchema.safeParse({ nhanVienId: '9' }).data.nhanVienId).toBe(9);
    expect(GanNhanVienSchema.safeParse({ nhanVienId: 0 }).success).toBe(false);
  });
  test('khóa tài khoản: hoatDong phải là boolean thật (chuỗi "false" bị từ chối, tránh khóa/mở nhầm)', () => {
    expect(TrangThaiTaiKhoanSchema.safeParse({ hoatDong: false }).success).toBe(true);
    expect(TrangThaiTaiKhoanSchema.safeParse({ hoatDong: true }).data.hoatDong).toBe(true);
    expect(TrangThaiTaiKhoanSchema.safeParse({ hoatDong: 'false' }).success).toBe(false);
    expect(TrangThaiTaiKhoanSchema.safeParse({}).success).toBe(false);
  });
});
