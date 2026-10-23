const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");

const passport = require("../config/passport");
const { daCauHinhGoogle } = passport;

const { sql, getPool } = require("../db");
const { validate } = require("../middleware/validate");
const { xacThuc, requireRole } = require("../middleware/auth");
const { guiEmailKhoiPhucMatKhau } = require("../services/mailer");
const logger = require("../services/logger");
const {
  DangKySchema,
  DangNhapSchema,
  QuenMatKhauSchema,
  DatLaiMatKhauSchema,
} = require("../validation/auth");

const router = express.Router();

const gioiHanDangNhap = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_DANG_NHAP) || 20,
  message: { message: "Thử đăng nhập sai quá nhiều lần, vui lòng đợi 15 phút" },
});

// Chống dò tên đăng nhập qua /kiem-tra-ten
const gioiHanKiemTraTen = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_KIEM_TRA_TEN) || 60,
  message: { message: "Yêu cầu quá nhiều, vui lòng thử lại sau" },
});

const gioiHanKhoiPhucMatKhau = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_KHOI_PHUC_MAT_KHAU) || 5,
  message: { message: "Yêu cầu quá nhiều, vui lòng thử lại sau" },
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
    const { tenDangNhap, matKhau, nhanVienId, hoTen } = req.body;
    const hash = await bcrypt.hash(matKhau, 10);
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      let employeeId = nhanVienId;
      if (employeeId === undefined) {
        const employee = await transaction
          .request()
          .input("hoTen", hoTen)
          .query(
            `INSERT INTO NhanVien (HoTen)
             OUTPUT INSERTED.Id
             VALUES (@hoTen)`,
          );
        employeeId = employee.recordset[0].Id;
      }

      const account = await transaction
        .request()
        .input("u", tenDangNhap)
        .input("e", tenDangNhap)
        .input("p", hash)
        .input("nv", employeeId)
        .query(
          `INSERT INTO TaiKhoan (TenDangNhap, Email, MatKhau, NhanVienId, VaiTro)
           OUTPUT INSERTED.Id, INSERTED.NhanVienId, INSERTED.TenDangNhap
           VALUES (@u, @e, @p, @nv, 'nhan_vien')`,
        );
      await transaction.commit();
      res.status(201).json({
        message: "Đã tạo tài khoản",
        taiKhoan: account.recordset[0],
      });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
);

router.get("/kiem-tra-ten", gioiHanKiemTraTen, async (req, res) => {
  const { tenDangNhap } = req.query;
  const pool = await getPool();
  const r = await pool
    .request()
    .input("u", typeof tenDangNhap === "string" ? tenDangNhap.trim().toLowerCase() : tenDangNhap)
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
      .input("u", tenDangNhap.trim().toLowerCase())
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
// Luôn trả thông báo chung và chỉ gửi khi email khớp duy nhất một tài khoản.
router.post(
  "/quen-mat-khau",
  gioiHanKhoiPhucMatKhau,
  validate(QuenMatKhauSchema),
  async (req, res) => {
  const { email } = req.body;
  const pool = await getPool();
  const taiKhoan = await pool
    .request()
    .input("e", email)
    .query(
      `SELECT TOP (2) Id FROM TaiKhoan WHERE Email = @e ORDER BY Id`,
    );

  if (taiKhoan.recordset.length === 1) {
    const ma = crypto.randomBytes(32).toString("hex");
    const han = new Date(Date.now() + 30 * 60 * 1000);
    await pool
      .request()
      .input("id", taiKhoan.recordset[0].Id)
      .input("ma", ma)
      .input("han", han)
      .query(
        `UPDATE TaiKhoan SET MaKhoiPhucMatKhau = @ma, HanKhoiPhuc = @han
         WHERE Id = @id`,
      );
    try {
      await guiEmailKhoiPhucMatKhau(email, ma);
    } catch (err) {
      logger.error("Không gửi được email khôi phục mật khẩu", {
        error: err.message,
      });
    }
  } else if (taiKhoan.recordset.length > 1) {
    logger.warn("Email khôi phục khớp nhiều tài khoản; không gửi liên kết.");
  }
  res.json({ message: "Nếu tài khoản tồn tại, email khôi phục đã được gửi" });
  },
);

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
router.get("/google", (req, res, next) => {
  if (!daCauHinhGoogle) {
    return res
      .status(503)
      .json({ message: "Đăng nhập Google chưa được cấu hình (thiếu GOOGLE_CLIENT_ID/SECRET trong .env)" });
  }
  passport.authenticate("google", { scope: ["profile", "email"], session: false })(req, res, next);
});

router.get("/google/callback", (req, res, next) => {
  if (!daCauHinhGoogle) {
    return res.redirect(`${process.env.FRONTEND_URL || ""}/dang-nhap`);
  }
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL || ""}/dang-nhap`,
  })(req, res, next);
}, async (req, res) => {
    const pool = await getPool();
    const accessToken = taoAccessToken(req.user);
    const refreshToken = await taoVaLuuRefreshToken(pool, req.user.Id);
    res.redirect(
      `${process.env.FRONTEND_URL || ""}/oauth-callback?accessToken=${accessToken}&refreshToken=${refreshToken}`,
    );
  },
);

module.exports = router;
