const { getPool } = require('../db');

/**
 * Dùng cho các API cho phép cả vai trò `nhan_vien` ĐỌC dữ liệu.
 * Tài khoản nhan_vien phải đã được HR gắn với 1 hồ sơ nhân viên; tài khoản
 * mới tự đăng ký / mới đăng nhập Google (NhanVienId = NULL) chưa được xem gì.
 *
 * Lưu ý: accessToken sống 15 phút nên claim `employeeId` trong token có thể cũ
 * (HR vừa gắn hồ sơ xong). Vì vậy khi claim rỗng ta tra lại DB 1 lần.
 */
async function yeuCauDaGanHoSo(req, res, next) {
  if (req.user.role !== 'nhan_vien') return next();

  if (!req.user.employeeId) {
    const pool = await getPool();
    const r = await pool
      .request()
      .input('id', req.user.id)
      .query('SELECT NhanVienId FROM TaiKhoan WHERE Id = @id');
    req.user.employeeId = r.recordset[0]?.NhanVienId ?? null;
  }

  if (!req.user.employeeId) {
    return res.status(403).json({
      message: 'Tài khoản chưa được gắn hồ sơ nhân viên, vui lòng liên hệ bộ phận nhân sự',
      maLoi: 'CHUA_GAN_HO_SO',
    });
  }
  next();
}

module.exports = { yeuCauDaGanHoSo };
