require('dotenv').config();
const bcrypt = require('bcrypt');
const { getPool } = require('../src/db');
const { AdminDatLaiMatKhauSchema } = require('../src/validation/taiKhoan');

/**
 * Cứu hộ khi quản trị viên CUỐI CÙNG quên mật khẩu (không còn trang "Quên mật khẩu" công khai).
 * Chạy trực tiếp trên máy chủ có quyền vào DB:
 *     node scripts/datLaiAdmin.js <tenDangNhap> <matKhauMoi>
 * Tài khoản được mở khóa, mọi phiên cũ bị thu hồi, và buộc đổi mật khẩu ở lần đăng nhập kế tiếp.
 */
(async () => {
  const [, , tenDangNhap, matKhauMoi] = process.argv;
  if (!tenDangNhap || !matKhauMoi) {
    console.error('Cách dùng: node scripts/datLaiAdmin.js <tenDangNhap> <matKhauMoi>');
    process.exit(1);
  }
  const kiem = AdminDatLaiMatKhauSchema.safeParse({ matKhauMoi });
  if (!kiem.success) {
    console.error('Mật khẩu không đạt chính sách:', kiem.error.issues.map((i) => i.message).join('; '));
    process.exit(1);
  }

  const pool = await getPool();
  const r = await pool.request().input('u', tenDangNhap).query(`SELECT Id, VaiTro FROM TaiKhoan WHERE TenDangNhap = @u`);
  if (!r.recordset[0]) {
    console.error(`Không có tài khoản "${tenDangNhap}"`);
    process.exit(1);
  }
  const { Id, VaiTro } = r.recordset[0];
  await pool
    .request()
    .input('id', Id)
    .input('h', await bcrypt.hash(matKhauMoi, 10))
    .query(`UPDATE TaiKhoan SET MatKhauMaHoa = @h, BatDoiMatKhau = 1, HoatDong = 1,
                                MaKhoiPhucMatKhau = NULL, HanKhoiPhuc = NULL WHERE Id = @id;
            UPDATE RefreshToken SET DaThuHoi = 1 WHERE TaiKhoanId = @id AND DaThuHoi = 0;`);
  console.log(`Đã đặt lại mật khẩu cho "${tenDangNhap}" (${VaiTro}). Đăng nhập rồi đổi mật khẩu ngay.`);
  process.exit(0);
})().catch((e) => {
  console.error('Thất bại:', e.message);
  process.exit(1);
});
