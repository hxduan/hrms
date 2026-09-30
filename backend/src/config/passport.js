const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { getPool } = require('../db');

async function timHoacTaoTaiKhoanTuOAuth(profile) {
  const pool = await getPool();
  const existing = await pool
    .request()
    .input('id', profile.id)
    .query(
      `SELECT * FROM TaiKhoan WHERE NhaCungCapOAuth = 'google' AND MaNguoiDungOAuth = @id`
    );
  if (existing.recordset[0]) return existing.recordset[0];

  // Chưa có -> tạo mới TaiKhoan, CHƯA gắn NhanVienId (admin/HR gắn thủ công
  // sau đó qua màn hình Quản trị > Tài khoản)
  const created = await pool
    .request()
    .input('id', profile.id)
    .query(
      `INSERT INTO TaiKhoan (VaiTro, NhaCungCapOAuth, MaNguoiDungOAuth)
       OUTPUT INSERTED.*
       VALUES ('nhan_vien', 'google', @id)`
    );
  return created.recordset[0];
}

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: '/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const taiKhoan = await timHoacTaoTaiKhoanTuOAuth(profile);
        done(null, taiKhoan);
      } catch (err) {
        done(err);
      }
    }
  )
);

module.exports = passport;
