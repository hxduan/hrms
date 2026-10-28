const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

const passport = require('../config/passport');
const { daCauHinhGoogle } = passport;
const { getPool } = require('../db');
const { validate } = require('../middleware/validate');
const { xacThuc } = require('../middleware/auth');
const { guiEmailKhoiPhucMatKhau } = require('../services/mailer');
const logger = require('../services/logger');
const { DangNhapSchema } = require('../validation/auth'); // giữ nguyên schema đăng nhập của Giai đoạn 1
const {
  TuDangKySchema,
  DoiMatKhauSchema,
  DoiEmailSchema,
  QuenMatKhauSchema,
  DatLaiMatKhauSchema,
} = require('../validation/taiKhoan');

const router = express.Router();
const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');

// ---------------------------------------------------------------------------
// Tiện ích
// ---------------------------------------------------------------------------
const gioiHan = (soLan, phut, message, tuyChon = {}) =>
  rateLimit({ windowMs: phut * 60 * 1000, max: soLan, message: { message }, ...tuyChon });

// skipSuccessfulRequests: chỉ đếm các lần đăng nhập THẤT BẠI, nên đăng nhập đúng nhiều lần
// (VD chạy bộ test Postman với nhiều tài khoản) không bị khóa nhầm.
const gioiHanDangNhap = gioiHan(Number(process.env.GIOI_HAN_DANG_NHAP) || 5, 15, 'Thử đăng nhập sai quá nhiều lần, vui lòng đợi 15 phút', {
  skipSuccessfulRequests: true,
});
const gioiHanQuenMatKhau = gioiHan(10, 15, 'Yêu cầu quá nhiều lần, vui lòng đợi 15 phút');
const gioiHanTuDangKy = gioiHan(20, 60, 'Tạo tài khoản quá nhiều lần, vui lòng thử lại sau');

// Hash giả: so sánh mật khẩu với hash này khi tên đăng nhập KHÔNG tồn tại, để
// thời gian phản hồi gần như bằng nhau -> không dò được tên đăng nhập nào có thật.
const HASH_GIA = bcrypt.hashSync('hash-gia-khong-dung-that', 10);

const bamSha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

function taoAccessToken(taiKhoan) {
  return jwt.sign(
    { id: taiKhoan.Id, role: taiKhoan.VaiTro, employeeId: taiKhoan.NhanVienId },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
}

async function taoVaLuuRefreshToken(pool, taiKhoanId) {
  const refreshToken = crypto.randomBytes(40).toString('hex');
  const hetHan = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await pool
    .request()
    .input('tk', taiKhoanId)
    .input('rt', refreshToken)
    .input('han', hetHan)
    .query(`INSERT INTO RefreshToken (TaiKhoanId, Token, HetHan) VALUES (@tk, @rt, @han)`);
  return refreshToken;
}

async function thuHoiMoiRefreshToken(pool, taiKhoanId) {
  await pool
    .request()
    .input('id', taiKhoanId)
    .query(`UPDATE RefreshToken SET DaThuHoi = 1 WHERE TaiKhoanId = @id AND DaThuHoi = 0`);
}

const hoSoCongKhai = (tk) => ({
  Id: tk.Id,
  TenDangNhap: tk.TenDangNhap,
  Email: tk.Email,
  VaiTro: tk.VaiTro,
  NhanVienId: tk.NhanVienId,
});

// ---------------------------------------------------------------------------
// Kiểm tra trùng tên đăng nhập (dùng cho ô nhập ở form, kiểm tra khi rời ô)
// ---------------------------------------------------------------------------
router.get('/kiem-tra-ten', async (req, res) => {
  const pool = await getPool();
  const r = await pool
    .request()
    .input('u', (req.query.tenDangNhap ?? '').toString())
    .query('SELECT COUNT(*) AS cnt FROM TaiKhoan WHERE TenDangNhap = @u');
  res.json({ daTonTai: r.recordset[0].cnt > 0 });
});

// ---------------------------------------------------------------------------
// TỰ ĐĂNG KÝ (công khai)
// Tài khoản tạo ra luôn là `nhan_vien`, CHƯA gắn hồ sơ (NhanVienId = NULL) nên
// chưa xem được dữ liệu nào cho tới khi HR gắn hồ sơ ở Quản trị > Tài khoản.
// Vai trò KHÔNG BAO GIỜ lấy từ request — schema cũng loại bỏ trường vaiTro.
// ---------------------------------------------------------------------------
router.post('/tu-dang-ky', gioiHanTuDangKy, validate(TuDangKySchema), async (req, res) => {
  if (process.env.CHO_PHEP_TU_DANG_KY === 'false') {
    return res.status(403).json({ message: 'Hệ thống đang tắt chức năng tự đăng ký, vui lòng liên hệ bộ phận nhân sự' });
  }
  const { tenDangNhap, email, matKhau } = req.body;
  const pool = await getPool();

  const trung = await pool
    .request()
    .input('u', tenDangNhap)
    .input('e', email)
    .query(`SELECT TenDangNhap, Email FROM TaiKhoan WHERE TenDangNhap = @u OR Email = @e`);
  if (trung.recordset.some((d) => d.TenDangNhap?.toLowerCase() === tenDangNhap.toLowerCase())) {
    return res.status(409).json({ message: 'Tên đăng nhập đã tồn tại', truong: 'tenDangNhap' });
  }
  if (trung.recordset.length > 0) {
    return res.status(409).json({ message: 'Email đã được sử dụng', truong: 'email' });
  }

  const hash = await bcrypt.hash(matKhau, 10);
  await pool
    .request()
    .input('u', tenDangNhap)
    .input('e', email)
    .input('p', hash)
    .query(
      `INSERT INTO TaiKhoan (TenDangNhap, Email, MatKhauMaHoa, VaiTro)
       VALUES (@u, @e, @p, 'nhan_vien')`
    );
  res.status(201).json({
    message: 'Tạo tài khoản thành công. Bộ phận nhân sự cần gắn hồ sơ nhân viên trước khi bạn xem được dữ liệu.',
  });
});

// ---------------------------------------------------------------------------
// ĐĂNG NHẬP
// ---------------------------------------------------------------------------
router.post('/login', gioiHanDangNhap, validate(DangNhapSchema), async (req, res) => {
  const { tenDangNhap, matKhau } = req.body;
  const pool = await getPool();
  const r = await pool
    .request()
    .input('u', tenDangNhap)
    .query('SELECT * FROM TaiKhoan WHERE TenDangNhap = @u');
  const taiKhoan = r.recordset[0];

  const dung = await bcrypt.compare(matKhau, taiKhoan?.MatKhauMaHoa ?? HASH_GIA);
  if (!taiKhoan || !taiKhoan.MatKhauMaHoa || !dung) {
    return res.status(401).json({ message: 'Sai tài khoản hoặc mật khẩu' });
  }

  const accessToken = taoAccessToken(taiKhoan);
  const refreshToken = await taoVaLuuRefreshToken(pool, taiKhoan.Id);
  res.json({ accessToken, refreshToken, nguoiDung: hoSoCongKhai(taiKhoan) });
});

// ---------------------------------------------------------------------------
// LÀM MỚI ACCESS TOKEN
// ---------------------------------------------------------------------------
router.post('/lam-moi-token', async (req, res) => {
  const refreshToken = (req.body?.refreshToken ?? '').toString();
  const pool = await getPool();
  const r = await pool
    .request()
    .input('rt', refreshToken)
    .query(
      `SELECT rt.TaiKhoanId, tk.VaiTro, tk.NhanVienId
       FROM RefreshToken rt JOIN TaiKhoan tk ON tk.Id = rt.TaiKhoanId
       WHERE rt.Token = @rt AND rt.DaThuHoi = 0 AND rt.HetHan > GETDATE()`
    );
  if (!r.recordset[0]) {
    return res.status(401).json({ message: 'Refresh token không hợp lệ hoặc đã hết hạn' });
  }
  const dong = r.recordset[0];
  // Vai trò / hồ sơ được đọc lại từ DB mỗi lần làm mới => đổi vai trò có hiệu lực tối đa sau 15 phút
  const accessToken = jwt.sign(
    { id: dong.TaiKhoanId, role: dong.VaiTro, employeeId: dong.NhanVienId },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
  res.json({ accessToken });
});

// ---------------------------------------------------------------------------
// ĐĂNG XUẤT — thu hồi refresh token (trước đây chỉ xóa localStorage nên token
// vẫn dùng được 7 ngày nếu bị lấy cắp)
// ---------------------------------------------------------------------------
router.post('/dang-xuat', async (req, res) => {
  const refreshToken = (req.body?.refreshToken ?? '').toString();
  if (refreshToken) {
    const pool = await getPool();
    await pool
      .request()
      .input('rt', refreshToken)
      .query(`UPDATE RefreshToken SET DaThuHoi = 1 WHERE Token = @rt`);
  }
  res.json({ message: 'Đã đăng xuất' });
});

// ---------------------------------------------------------------------------
// THÔNG TIN NGƯỜI ĐANG ĐĂNG NHẬP (frontend dùng để biết vai trò, hiển thị menu)
// ---------------------------------------------------------------------------
router.get('/me', xacThuc, async (req, res) => {
  const pool = await getPool();
  const r = await pool
    .request()
    .input('id', req.user.id)
    .query(
      `SELECT tk.Id, tk.TenDangNhap, tk.Email, tk.VaiTro, tk.NhaCungCapOAuth, tk.NhanVienId, tk.NgayTao,
              CASE WHEN tk.MatKhauMaHoa IS NOT NULL THEN 1 ELSE 0 END AS CoMatKhau,
              nv.MaNhanVien, nv.HoTen
       FROM TaiKhoan tk LEFT JOIN NhanVien nv ON nv.Id = tk.NhanVienId
       WHERE tk.Id = @id`
    );
  if (!r.recordset[0]) return res.status(401).json({ message: 'Tài khoản không còn tồn tại' });
  res.json(r.recordset[0]);
});

// ---------------------------------------------------------------------------
// ĐỔI MẬT KHẨU (đã đăng nhập). Sai mật khẩu hiện tại trả 400 (KHÔNG phải 401)
// để interceptor ở frontend không nhầm với "token hết hạn".
// ---------------------------------------------------------------------------
router.post('/doi-mat-khau', xacThuc, validate(DoiMatKhauSchema), async (req, res) => {
  const { matKhauHienTai, matKhauMoi } = req.body;
  const pool = await getPool();
  const r = await pool
    .request()
    .input('id', req.user.id)
    .query('SELECT Id, VaiTro, NhanVienId, MatKhauMaHoa FROM TaiKhoan WHERE Id = @id');
  const taiKhoan = r.recordset[0];

  if (!taiKhoan?.MatKhauMaHoa) {
    return res.status(400).json({ message: 'Tài khoản đăng nhập bằng Google, không có mật khẩu để đổi' });
  }
  if (!(await bcrypt.compare(matKhauHienTai, taiKhoan.MatKhauMaHoa))) {
    return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng', truong: 'matKhauHienTai' });
  }

  const hash = await bcrypt.hash(matKhauMoi, 10);
  await pool
    .request()
    .input('id', taiKhoan.Id)
    .input('hash', hash)
    .query('UPDATE TaiKhoan SET MatKhauMaHoa = @hash WHERE Id = @id');

  // Đăng xuất mọi thiết bị khác, cấp token mới cho phiên hiện tại
  await thuHoiMoiRefreshToken(pool, taiKhoan.Id);
  const refreshToken = await taoVaLuuRefreshToken(pool, taiKhoan.Id);
  res.json({ message: 'Đổi mật khẩu thành công', accessToken: taoAccessToken(taiKhoan), refreshToken });
});

// ---------------------------------------------------------------------------
// ĐỔI EMAIL — bắt buộc nhập mật khẩu hiện tại, vì email là nơi nhận mã khôi
// phục mật khẩu: kẻ chiếm được phiên đăng nhập không được tự đổi email để chiếm hẳn tài khoản.
// ---------------------------------------------------------------------------
router.put('/me/email', xacThuc, validate(DoiEmailSchema), async (req, res) => {
  const { email, matKhauHienTai } = req.body;
  const pool = await getPool();
  const r = await pool
    .request()
    .input('id', req.user.id)
    .query('SELECT Id, MatKhauMaHoa FROM TaiKhoan WHERE Id = @id');
  const taiKhoan = r.recordset[0];

  if (!taiKhoan?.MatKhauMaHoa) {
    return res.status(400).json({ message: 'Tài khoản đăng nhập bằng Google không đổi email tại đây' });
  }
  if (!(await bcrypt.compare(matKhauHienTai, taiKhoan.MatKhauMaHoa))) {
    return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng', truong: 'matKhauHienTai' });
  }
  const trung = await pool
    .request()
    .input('e', email)
    .input('id', taiKhoan.Id)
    .query('SELECT 1 AS x FROM TaiKhoan WHERE Email = @e AND Id <> @id');
  if (trung.recordset[0]) {
    return res.status(409).json({ message: 'Email đã được sử dụng', truong: 'email' });
  }
  await pool
    .request()
    .input('e', email)
    .input('id', taiKhoan.Id)
    .query('UPDATE TaiKhoan SET Email = @e WHERE Id = @id');
  res.json({ message: 'Đã cập nhật email', email });
});

// ---------------------------------------------------------------------------
// QUÊN MẬT KHẨU
// VÁ LỖI Giai đoạn 1: mã khôi phục chỉ gửi tới Email LƯU TRONG DB của tài khoản,
// không còn gửi tới địa chỉ do người yêu cầu tự nhập. Mã được lưu dạng băm
// SHA-256 (lộ DB cũng không dùng được mã). Luôn trả cùng 1 thông báo.
// ---------------------------------------------------------------------------
router.post('/quen-mat-khau', gioiHanQuenMatKhau, validate(QuenMatKhauSchema), async (req, res) => {
  const { dinhDanh } = req.body;
  const pool = await getPool();
  const r = await pool
    .request()
    .input('d', dinhDanh)
    .query(
      `SELECT TOP 1 Id, Email FROM TaiKhoan
       WHERE (TenDangNhap = @d OR Email = @d) AND Email IS NOT NULL`
    );
  const taiKhoan = r.recordset[0];

  if (taiKhoan) {
    const ma = crypto.randomBytes(32).toString('hex');
    await pool
      .request()
      .input('id', taiKhoan.Id)
      .input('ma', bamSha256(ma))
      .input('han', new Date(Date.now() + 30 * 60 * 1000))
      .query(`UPDATE TaiKhoan SET MaKhoiPhucMatKhau = @ma, HanKhoiPhuc = @han WHERE Id = @id`);
    try {
      await guiEmailKhoiPhucMatKhau(taiKhoan.Email, ma);
    } catch (err) {
      logger.error('Gửi email khôi phục mật khẩu thất bại', { message: err.message });
    }
  }
  res.json({ message: 'Nếu tài khoản tồn tại và có email, hướng dẫn khôi phục đã được gửi' });
});

router.post('/dat-lai-mat-khau', gioiHanQuenMatKhau, validate(DatLaiMatKhauSchema), async (req, res) => {
  const { ma, matKhauMoi } = req.body;
  const pool = await getPool();
  const r = await pool
    .request()
    .input('ma', bamSha256(ma))
    .query(`SELECT Id FROM TaiKhoan WHERE MaKhoiPhucMatKhau = @ma AND HanKhoiPhuc > GETDATE()`);
  if (!r.recordset[0]) {
    return res.status(400).json({ message: 'Mã khôi phục không hợp lệ hoặc đã hết hạn' });
  }
  const id = r.recordset[0].Id;
  const hash = await bcrypt.hash(matKhauMoi, 10);
  await pool
    .request()
    .input('id', id)
    .input('hash', hash)
    .query(
      `UPDATE TaiKhoan SET MatKhauMaHoa = @hash, MaKhoiPhucMatKhau = NULL, HanKhoiPhuc = NULL
       WHERE Id = @id`
    );
  await thuHoiMoiRefreshToken(pool, id); // mọi thiết bị đang đăng nhập phải đăng nhập lại
  res.json({ message: 'Đặt lại mật khẩu thành công' });
});

// ---------------------------------------------------------------------------
// GOOGLE OAUTH (giữ nguyên Giai đoạn 1)
// ---------------------------------------------------------------------------
router.get('/google', (req, res, next) => {
  if (!daCauHinhGoogle) {
    return res.status(503).json({ message: 'Đăng nhập Google chưa được cấu hình' });
  }
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })(req, res, next);
});

router.get(
  '/google/callback',
  (req, res, next) => {
    if (!daCauHinhGoogle) {
      return res.redirect(new URL('/dang-nhap', frontendUrl).toString());
    }
    passport.authenticate('google', {
      session: false,
      failureRedirect: new URL('/dang-nhap', frontendUrl).toString(),
    })(req, res, next);
  },
  async (req, res) => {
    const pool = await getPool();
    const accessToken = taoAccessToken(req.user);
    const refreshToken = await taoVaLuuRefreshToken(pool, req.user.Id);
    const callbackUrl = new URL('/oauth-callback', frontendUrl);
    callbackUrl.searchParams.set('accessToken', accessToken);
    callbackUrl.searchParams.set('refreshToken', refreshToken);
    res.redirect(callbackUrl.toString());
  }
);

module.exports = router;
