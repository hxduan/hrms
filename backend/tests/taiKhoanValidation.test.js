const {
  TuDangKySchema,
  TaoTaiKhoanSchema,
  DoiMatKhauSchema,
  QuenMatKhauSchema,
  DatLaiMatKhauSchema,
  DoiVaiTroSchema,
  GanNhanVienSchema,
} = require('../src/validation/taiKhoan');

describe('Chính sách mật khẩu (đăng ký, đổi, đặt lại)', () => {
  const co = (matKhau) => TuDangKySchema.safeParse({ tenDangNhap: 'abc', email: 'a@b.vn', matKhau });

  test('chấp nhận mật khẩu đủ mạnh', () => {
    expect(co('Matkhau123').success).toBe(true);
  });
  test('từ chối <8 ký tự, thiếu chữ, thiếu số, >72 ký tự', () => {
    expect(co('Ab1').success).toBe(false);
    expect(co('12345678').success).toBe(false);
    expect(co('abcdefgh').success).toBe(false);
    expect(co('a1' + 'x'.repeat(80)).success).toBe(false);
  });
  test('DatLaiMatKhauSchema áp dụng cùng chính sách', () => {
    expect(DatLaiMatKhauSchema.safeParse({ ma: 'x', matKhauMoi: 'yeu' }).success).toBe(false);
    expect(DatLaiMatKhauSchema.safeParse({ ma: 'x', matKhauMoi: 'Manh1234' }).success).toBe(true);
  });
});

describe('TuDangKySchema', () => {
  test('email được đưa về chữ thường và cắt khoảng trắng', () => {
    const kq = TuDangKySchema.safeParse({ tenDangNhap: ' user_1 ', email: '  User@Mail.COM ', matKhau: 'Matkhau123' });
    expect(kq.success).toBe(true);
    expect(kq.data.email).toBe('user@mail.com');
    expect(kq.data.tenDangNhap).toBe('user_1');
  });
  test('từ chối tên đăng nhập có dấu cách / tiếng Việt có dấu / quá ngắn', () => {
    const t = (tenDangNhap) => TuDangKySchema.safeParse({ tenDangNhap, email: 'a@b.vn', matKhau: 'Matkhau123' }).success;
    expect(t('nguyen van a')).toBe(false);
    expect(t('nguyễn')).toBe(false);
    expect(t('ab')).toBe(false);
  });
  test('từ chối email sai định dạng', () => {
    expect(TuDangKySchema.safeParse({ tenDangNhap: 'abc', email: 'khong-phai-email', matKhau: 'Matkhau123' }).success).toBe(false);
  });
  test('KHÔNG nhận trường vaiTro từ đăng ký công khai (chống tự cấp quyền admin)', () => {
    const kq = TuDangKySchema.safeParse({ tenDangNhap: 'abc', email: 'a@b.vn', matKhau: 'Matkhau123', vaiTro: 'admin' });
    expect(kq.success).toBe(true);
    expect(kq.data.vaiTro).toBeUndefined();
  });
});

describe('TaoTaiKhoanSchema (admin/HR tạo)', () => {
  const co = { tenDangNhap: 'nv02', email: 'nv02@x.vn', matKhau: 'Matkhau123' };
  test('vaiTro mặc định nhan_vien, nhanVienId mặc định null', () => {
    const kq = TaoTaiKhoanSchema.safeParse(co);
    expect(kq.data.vaiTro).toBe('nhan_vien');
    expect(kq.data.nhanVienId).toBeNull();
  });
  test('từ chối vai trò lạ', () => {
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
  test('quên mật khẩu nhận tên đăng nhập HOẶC email trong 1 ô', () => {
    expect(QuenMatKhauSchema.safeParse({ dinhDanh: 'admin' }).success).toBe(true);
    expect(QuenMatKhauSchema.safeParse({ dinhDanh: 'a@b.vn' }).success).toBe(true);
    expect(QuenMatKhauSchema.safeParse({ dinhDanh: '  ' }).success).toBe(false);
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
});
