const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const passport = require('passport');
const rateLimit = require('express-rate-limit');

const { getPool } = require('../db');
const { validate } = require('../middleware/validate');
const { xacThuc, requireRole } = require('../middleware/auth');
const { bamSha256 } = require('../services/khoiPhucMatKhau');
const { DangNhapSchema } = require('../validation/auth'); // giữ nguyên schema đăng nhập của Giai đoạn 1
const { DoiMatKhauSchema, DoiEmailSchema, DatLaiMatKhauSchema } = require('../validation/taiKhoan');

const router = express.Router();

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
const gioiHanDatLai = gioiHan(10, 15, 'Yêu cầu quá nhiều lần, vui lòng đợi 15 phút');

// Hash giả: so sánh mật khẩu với hash này khi tên đăng nhập KHÔNG tồn tại, để
// thời gian phản hồi gần như bằng nhau -> không dò được tên đăng nhập nào có thật.
const HASH_GIA = bcrypt.hashSync('hash-gia-khong-dung-that', 10);

function taoAccessToken(taiKhoan) {
  return jwt.sign(
    { id: taiKhoan.Id, role: taiKhoan.VaiTro, employeeId: taiKhoan.NhanVienId, bdm: !!taiKhoan.BatDoiMatKhau },
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
  BatDoiMatKhau: !!tk.BatDoiMatKhau,
});

// ---------------------------------------------------------------------------
// Kiểm tra trùng tên đăng nhập — CHỈ admin/HR (form tạo tài khoản). Trước đây công khai nên
// ai cũng dò được tên đăng nhập nào tồn tại.
// ---------------------------------------------------------------------------
router.get('/kiem-tra-ten', xacThuc, requireRole('admin', 'hr'), async (req, res) => {
  const pool = await getPool();
  const r = await pool
    .request()
    .input('u', (req.query.tenDangNhap ?? '').toString())
    .query('SELECT COUNT(*) AS cnt FROM TaiKhoan WHERE TenDangNhap = @u');
  res.json({ daTonTai: r.recordset[0].cnt > 0 });
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
  // Chỉ báo "bị khóa" khi mật khẩu ĐÚNG, để không lộ thông tin cho người dò tài khoản
  if (taiKhoan.HoatDong === false) {
    return res.status(403).json({ message: 'Tài khoản đã bị khóa, vui lòng liên hệ bộ phận Nhân sự' });
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
      `SELECT rt.TaiKhoanId, tk.VaiTro, tk.NhanVienId, tk.BatDoiMatKhau
       FROM RefreshToken rt JOIN TaiKhoan tk ON tk.Id = rt.TaiKhoanId
       WHERE rt.Token = @rt AND rt.DaThuHoi = 0 AND rt.HetHan > GETDATE() AND tk.HoatDong = 1`
    );
  if (!r.recordset[0]) {
    return res.status(401).json({ message: 'Refresh token không hợp lệ hoặc đã hết hạn' });
  }
  const dong = r.recordset[0];
  // Vai trò / hồ sơ được đọc lại từ DB mỗi lần làm mới => đổi vai trò có hiệu lực tối đa sau 15 phút
  const accessToken = jwt.sign(
    { id: dong.TaiKhoanId, role: dong.VaiTro, employeeId: dong.NhanVienId, bdm: !!dong.BatDoiMatKhau },
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
      `SELECT tk.Id, tk.TenDangNhap, tk.Email, tk.VaiTro, tk.NhaCungCapOAuth, tk.NhanVienId, tk.NgayTao, tk.BatDoiMatKhau,
              CASE WHEN tk.MatKhauMaHoa IS NOT NULL THEN 1 ELSE 0 END AS CoMatKhau,
              nv.MaNhanVien, nv.HoTen
       FROM TaiKhoan tk LEFT JOIN NhanVien nv ON nv.Id = tk.NhanVienId
       WHERE tk.Id = @id AND tk.HoatDong = 1`
    );
  if (!r.recordset[0]) return res.status(401).json({ message: 'Tài khoản không còn tồn tại hoặc đã bị khóa' });
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
    .query('SELECT Id, VaiTro, NhanVienId, MatKhauMaHoa FROM TaiKhoan WHERE Id = @id AND HoatDong = 1');
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
    .query('UPDATE TaiKhoan SET MatKhauMaHoa = @hash, BatDoiMatKhau = 0 WHERE Id = @id');

  // Đăng xuất mọi thiết bị khác, cấp token mới (đã hết cờ buộc đổi mật khẩu) cho phiên hiện tại
  await thuHoiMoiRefreshToken(pool, taiKhoan.Id);
  const refreshToken = await taoVaLuuRefreshToken(pool, taiKhoan.Id);
  res.json({
    message: 'Đổi mật khẩu thành công',
    accessToken: taoAccessToken({ ...taiKhoan, BatDoiMatKhau: 0 }),
    refreshToken,
  });
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
// ĐẶT LẠI MẬT KHẨU BẰNG LIÊN KẾT TRONG EMAIL
// Không còn trang "Quên mật khẩu" công khai: liên kết này chỉ được tạo khi admin/HR bấm
// "Gửi liên kết đặt lại mật khẩu" ở Quản trị > Tài khoản (POST /tai-khoan/:id/gui-lien-ket-dat-lai).
// Ai giữ mã hợp lệ (băm SHA-256 trong DB, hiệu lực 30 phút) thì được đặt mật khẩu mới.
// ---------------------------------------------------------------------------
router.post('/dat-lai-mat-khau', gioiHanDatLai, validate(DatLaiMatKhauSchema), async (req, res) => {
  const { ma, matKhauMoi } = req.body;
  const pool = await getPool();
  const r = await pool
    .request()
    .input('ma', bamSha256(ma))
    .query(`SELECT Id FROM TaiKhoan WHERE MaKhoiPhucMatKhau = @ma AND HanKhoiPhuc > GETDATE() AND HoatDong = 1`);
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
      `UPDATE TaiKhoan SET MatKhauMaHoa = @hash, MaKhoiPhucMatKhau = NULL, HanKhoiPhuc = NULL, BatDoiMatKhau = 0
       WHERE Id = @id`
    );
  await thuHoiMoiRefreshToken(pool, id); // mọi thiết bị đang đăng nhập phải đăng nhập lại
  res.json({ message: 'Đặt lại mật khẩu thành công' });
});

// ---------------------------------------------------------------------------
// GOOGLE OAUTH (giữ nguyên Giai đoạn 1)
// ---------------------------------------------------------------------------
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/dang-nhap` }),
  async (req, res) => {
    if (req.user.HoatDong === false || req.user.HoatDong === 0) {
      return res.redirect(`${process.env.FRONTEND_URL}/dang-nhap?loi=khoa`);
    }
    const pool = await getPool();
    const accessToken = taoAccessToken(req.user);
    const refreshToken = await taoVaLuuRefreshToken(pool, req.user.Id);
    res.redirect(
      `${process.env.FRONTEND_URL}/oauth-callback?accessToken=${accessToken}&refreshToken=${refreshToken}`
    );
  }
);

module.exports = router;
