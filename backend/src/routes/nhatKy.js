const express = require('express');

const { getPool } = require('../db');
const { xacThuc, requireRole } = require('../middleware/auth');
const { loiNghiepVu } = require('../services/loi');

const router = express.Router();

// Lịch sử thay đổi của 1 bản ghi: GET /nhat-ky-thay-doi?tenBang=PhongBan&banGhiId=5
// Chỉ admin/HR xem được. Mới nhất ở trên, tối đa 200 dòng.
router.get('/', xacThuc, requireRole('admin', 'hr'), async (req, res) => {
  const { tenBang } = req.query;
  const banGhiId = Number(req.query.banGhiId);
  if (!tenBang || !/^[A-Za-z_]+$/.test(tenBang) || !Number.isInteger(banGhiId) || banGhiId <= 0) {
    throw loiNghiepVu(400, 'Thiếu hoặc sai tenBang / banGhiId');
  }
  const pool = await getPool();
  const r = await pool
    .request()
    .input('b', tenBang)
    .input('id', banGhiId)
    .query(
      `SELECT TOP 200 n.Id, n.TenCot, n.GiaTriCu, n.GiaTriMoi, n.ThoiGian,
              COALESCE(tk.TenDangNhap, CONCAT(N'Tài khoản #', n.NguoiThucHienId)) AS NguoiThucHien
       FROM NhatKyThayDoi n
       LEFT JOIN TaiKhoan tk ON tk.Id = n.NguoiThucHienId
       WHERE n.TenBang = @b AND n.BanGhiId = @id
       ORDER BY n.ThoiGian DESC, n.Id DESC`
    );
  res.json(r.recordset);
});

module.exports = router;
