const { z } = require('zod');

const DangKySchema = z.object({
  tenDangNhap: z.string().min(3, 'Tên đăng nhập tối thiểu 3 ký tự').max(100),
  matKhau: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
  nhanVienId: z.number().int().optional(),
});

const DangNhapSchema = z.object({
  tenDangNhap: z.string().min(1, 'Bắt buộc nhập tên đăng nhập'),
  matKhau: z.string().min(1, 'Bắt buộc nhập mật khẩu'),
});

const QuenMatKhauSchema = z.object({
  tenDangNhap: z.string().min(1),
  email: z.string().email('Email không hợp lệ'),
});

const DatLaiMatKhauSchema = z.object({
  ma: z.string().min(1),
  matKhauMoi: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
});

module.exports = { DangKySchema, DangNhapSchema, QuenMatKhauSchema, DatLaiMatKhauSchema };
