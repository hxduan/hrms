const crypto = require('crypto');
const { getPool } = require('../db');

const bamSha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

/**
 * Tạo mã đặt lại mật khẩu cho 1 tài khoản: lưu BẢN BĂM vào DB (lộ DB cũng không dùng được mã),
 * trả về mã gốc để gửi qua email. Hiệu lực 30 phút.
 */
async function taoMaKhoiPhuc(taiKhoanId) {
  const pool = await getPool();
  const ma = crypto.randomBytes(32).toString('hex');
  await pool
    .request()
    .input('id', taiKhoanId)
    .input('ma', bamSha256(ma))
    .input('han', new Date(Date.now() + 30 * 60 * 1000))
    .query('UPDATE TaiKhoan SET MaKhoiPhucMatKhau = @ma, HanKhoiPhuc = @han WHERE Id = @id');
  return ma;
}

module.exports = { bamSha256, taoMaKhoiPhuc };
