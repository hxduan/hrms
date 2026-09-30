const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const passport = require("passport");
const rateLimit = require("express-rate-limit");

const { getPool } = require("../db");
const { validate } = require("../middleware/validate");
const { xacThuc, requireRole } = require("../middleware/auth");
const { guiEmailKhoiPhucMatKhau } = require("../services/mailer");
const {
  DangKySchema,
  DangNhapSchema,
  QuenMatKhauSchema,
  DatLaiMatKhauSchema,
} = require("../validation/auth");

const router = express.Router();

const gioiHanDangNhap = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: "Thử đăng nhập sai quá nhiều lần, vui lòng đợi 15 phút" },
});

function taoAccessToken(taiKhoan) {
  return jwt.sign(
    { id: taiKhoan.Id, role: taiKhoan.VaiTro, employeeId: taiKhoan.NhanVienId },
    process.env.JWT_SECRET,
    { expiresIn: "15m" },
  );
}

async function taoVaLuuRefreshToken(pool, taiKhoanId) {
  const refreshToken = crypto.randomBytes(40).toString("hex");
  const hetHan = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await pool
    .request()
    .input("tk", taiKhoanId)
    .input("rt", refreshToken)
    .input("han", hetHan)
    .query(
      `INSERT INTO RefreshToken (TaiKhoanId, Token, HetHan) VALUES (@tk, @rt, @han)`,
    );
  return refreshToken;
}

// ---- Admin/HR tạo tài khoản thường cho nhân viên ----
router.post(
  "/dang-ky",
  xacThuc,
  requireRole("admin", "hr"),
  validate(DangKySchema),
  async (req, res) => {
    const { tenDangNhap, matKhau, nhanVienId } = req.body;
    const hash = await bcrypt.hash(matKhau, 10);
    const pool = await getPool();
    await pool
      .request()
      .input("u", tenDangNhap)
      .input("p", hash)
      .input("nv", nhanVienId ?? null)
      .query(
        `INSERT INTO TaiKhoan (TenDangNhap, MatKhau, NhanVienId, VaiTro)
         VALUES (@u, @p, @nv, 'nhan_vien')`,
      );
    res.status(201).json({ message: "Đã tạo tài khoản" });
  },
);

router.get("/kiem-tra-ten", async (req, res) => {
  const { tenDangNhap } = req.query;
  const pool = await getPool();
  const r = await pool
    .request()
    .input("u", tenDangNhap)
    .query("SELECT COUNT(*) AS cnt FROM TaiKhoan WHERE TenDangNhap = @u");
  res.json({ daTonTai: r.recordset[0].cnt > 0 });
});

// ---- Đăng nhập thường ----
router.post(
  "/login",
  gioiHanDangNhap,
  validate(DangNhapSchema),
  async (req, res) => {
    const { tenDangNhap, matKhau } = req.body;
    const pool = await getPool();
    const r = await pool
      .request()
      .input("u", tenDangNhap)
      .query("SELECT * FROM TaiKhoan WHERE TenDangNhap = @u");
    const taiKhoan = r.recordset[0];

    if (!taiKhoan || !taiKhoan.MatKhau) {
      return res.status(401).json({ message: "Sai tài khoản hoặc mật khẩu" });
    }
    const dung = await bcrypt.compare(matKhau, taiKhoan.MatKhau);
    if (!dung) {
      return res.status(401).json({ message: "Sai tài khoản hoặc mật khẩu" });
    }

    const accessToken = taoAccessToken(taiKhoan);
    const refreshToken = await taoVaLuuRefreshToken(pool, taiKhoan.Id);
    res.json({ accessToken, refreshToken });
  },
);

// ---- Làm mới access token ----
router.post("/lam-moi-token", async (req, res) => {
  const { refreshToken } = req.body;
  const pool = await getPool();
  const r = await pool
    .request()
    .input("rt", refreshToken)
    .query(
      `SELECT rt.*, tk.VaiTro, tk.NhanVienId
       FROM RefreshToken rt JOIN TaiKhoan tk ON tk.Id = rt.TaiKhoanId
       WHERE rt.Token = @rt AND rt.DaThuHoi = 0 AND rt.HetHan > GETDATE()`,
    );
  if (!r.recordset[0]) {
    return res
      .status(401)
      .json({ message: "Refresh token không hợp lệ hoặc đã hết hạn" });
  }
  const dong = r.recordset[0];
  const accessToken = jwt.sign(
    { id: dong.TaiKhoanId, role: dong.VaiTro, employeeId: dong.NhanVienId },
    process.env.JWT_SECRET,
    { expiresIn: "15m" },
  );
  res.json({ accessToken });
});

// ---- Quên mật khẩu ----
router.post("/quen-mat-khau", validate(QuenMatKhauSchema), async (req, res) => {
  const { tenDangNhap, email } = req.body;
  const pool = await getPool();
  const ma = crypto.randomBytes(32).toString("hex");
  const han = new Date(Date.now() + 30 * 60 * 1000);

  await pool
    .request()
    .input("u", tenDangNhap)
    .input("ma", ma)
    .input("han", han)
    .query(
      `UPDATE TaiKhoan SET MaKhoiPhucMatKhau = @ma, HanKhoiPhuc = @han WHERE TenDangNhap = @u`,
    );

  // Luôn trả cùng 1 thông báo, không lộ thông tin tài khoản có tồn tại hay không
  try {
    await guiEmailKhoiPhucMatKhau(email, ma);
  } catch (err) {
    // Không throw ra ngoài — vẫn trả thông báo chung để tránh dò quét username
  }
  res.json({ message: "Nếu tài khoản tồn tại, email khôi phục đã được gửi" });
});

router.post(
  "/dat-lai-mat-khau",
  validate(DatLaiMatKhauSchema),
  async (req, res) => {
    const { ma, matKhauMoi } = req.body;
    const pool = await getPool();
    const r = await pool
      .request()
      .input("ma", ma)
      .query(
        `SELECT Id FROM TaiKhoan WHERE MaKhoiPhucMatKhau = @ma AND HanKhoiPhuc > GETDATE()`,
      );
    if (!r.recordset[0]) {
      return res
        .status(400)
        .json({ message: "Mã khôi phục không hợp lệ hoặc đã hết hạn" });
    }
    const hash = await bcrypt.hash(matKhauMoi, 10);
    await pool
      .request()
      .input("id", r.recordset[0].Id)
      .input("hash", hash)
      .query(
        `UPDATE TaiKhoan SET MatKhau = @hash, MaKhoiPhucMatKhau = NULL, HanKhoiPhuc = NULL
       WHERE Id = @id`,
      );
    res.json({ message: "Đặt lại mật khẩu thành công" });
  },
);

// ---- Google OAuth ----
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  }),
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/dang-nhap`,
  }),
  async (req, res) => {
    const pool = await getPool();
    const accessToken = taoAccessToken(req.user);
    const refreshToken = await taoVaLuuRefreshToken(pool, req.user.Id);
    res.redirect(
      `${process.env.FRONTEND_URL}/oauth-callback?accessToken=${accessToken}&refreshToken=${refreshToken}`,
    );
  },
);

module.exports = router;
