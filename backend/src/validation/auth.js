const { z } = require('zod');

const DangKySchema = z.object({
  tenDangNhap: z.string().trim().email('Tên đăng nhập phải là email hợp lệ').max(254)
    .transform((email) => email.toLowerCase()),
  matKhau: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
  nhanVienId: z.number().int().optional(),
  hoTen: z.string().trim().min(1).max(200).optional(),
}).refine((data) => data.nhanVienId !== undefined || data.hoTen, {
  message: 'Cần có họ tên khi chưa liên kết với nhân viên có sẵn',
  path: ['hoTen'],
});

const DangNhapSchema = z.object({
  tenDangNhap: z.string().min(1, 'Bắt buộc nhập tên đăng nhập'),
  matKhau: z.string().min(1, 'Bắt buộc nhập mật khẩu'),
});

module.exports = { DangKySchema, DangNhapSchema };
