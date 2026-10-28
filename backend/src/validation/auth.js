const { z } = require('zod');

const DangNhapSchema = z.object({
  tenDangNhap: z.string().min(1, 'Bắt buộc nhập tên đăng nhập'),
  matKhau: z.string().min(1, 'Bắt buộc nhập mật khẩu'),
});

module.exports = { DangNhapSchema };
