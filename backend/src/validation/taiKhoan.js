const { z } = require('zod');
const { idTuyChon } = require('./chung');

const tenDangNhap = z
  .string({ required_error: 'Bắt buộc nhập tên đăng nhập' })
  .trim()
  .min(3, 'Tên đăng nhập tối thiểu 3 ký tự')
  .max(100, 'Tên đăng nhập tối đa 100 ký tự')
  .regex(/^[A-Za-z0-9_.@-]+$/, 'Chỉ gồm chữ không dấu, số và . _ - @');

const email = z
  .string({ required_error: 'Bắt buộc nhập email' })
  .trim()
  .toLowerCase()
  .min(1, 'Bắt buộc nhập email')
  .max(255, 'Email tối đa 255 ký tự')
  .email('Email không hợp lệ');

// bcrypt chỉ xử lý 72 byte đầu nên giới hạn 72 để không "cắt ngầm" mật khẩu dài
const matKhauMoi = z
  .string({ required_error: 'Bắt buộc nhập mật khẩu' })
  .min(8, 'Mật khẩu tối thiểu 8 ký tự')
  .max(72, 'Mật khẩu tối đa 72 ký tự')
  .regex(/[A-Za-z]/, 'Mật khẩu cần ít nhất 1 chữ cái')
  .regex(/\d/, 'Mật khẩu cần ít nhất 1 chữ số');

const vaiTro = z.enum(['admin', 'hr', 'nhan_vien'], { errorMap: () => ({ message: 'Vai trò không hợp lệ' }) });

const TuDangKySchema = z.object({ tenDangNhap, email, matKhau: matKhauMoi });

const TaoTaiKhoanSchema = z.object({
  tenDangNhap,
  email,
  matKhau: matKhauMoi,
  vaiTro: vaiTro.optional().default('nhan_vien'),
  nhanVienId: idTuyChon.optional().transform((v) => v ?? null),
});

const DoiMatKhauSchema = z
  .object({
    matKhauHienTai: z.string().min(1, 'Bắt buộc nhập mật khẩu hiện tại'),
    matKhauMoi,
  })
  .refine((d) => d.matKhauHienTai !== d.matKhauMoi, {
    path: ['matKhauMoi'],
    message: 'Mật khẩu mới phải khác mật khẩu hiện tại',
  });

const DoiEmailSchema = z.object({
  email,
  matKhauHienTai: z.string().min(1, 'Bắt buộc nhập mật khẩu hiện tại'),
});

const QuenMatKhauSchema = z.object({
  dinhDanh: z.string({ required_error: 'Bắt buộc nhập tên đăng nhập hoặc email' }).trim().min(1, 'Bắt buộc nhập tên đăng nhập hoặc email').max(255),
});

const DatLaiMatKhauSchema = z.object({
  ma: z.string().min(1, 'Thiếu mã khôi phục'),
  matKhauMoi,
});

const DoiVaiTroSchema = z.object({ vaiTro });
const GanNhanVienSchema = z.object({ nhanVienId: idTuyChon });
const AdminDatLaiMatKhauSchema = z.object({ matKhauMoi });

module.exports = {
  TuDangKySchema,
  TaoTaiKhoanSchema,
  DoiMatKhauSchema,
  DoiEmailSchema,
  QuenMatKhauSchema,
  DatLaiMatKhauSchema,
  DoiVaiTroSchema,
  GanNhanVienSchema,
  AdminDatLaiMatKhauSchema,
};
