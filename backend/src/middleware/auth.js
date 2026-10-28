const jwt = require('jsonwebtoken');
const { choPhepKhiBatDoiMatKhau } = require('../services/batDoiMatKhau');

/**
 * Xác thực JWT — gắn req.user = { id, role, employeeId, bdm }.
 * Nếu tài khoản đang bị buộc đổi mật khẩu (bdm) thì chỉ cho gọi vài API cần thiết.
 */
function xacThuc(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Chưa đăng nhập' });
  }
  try {
    req.user = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
  }
  if (req.user.bdm && !choPhepKhiBatDoiMatKhau(req.method, req.originalUrl)) {
    return res.status(403).json({
      message: 'Bạn đang dùng mật khẩu tạm, vui lòng đổi mật khẩu trước khi tiếp tục',
      maLoi: 'BAT_DOI_MAT_KHAU',
    });
  }
  next();
}

/** Kiểm tra vai trò — dùng SAU xacThuc. VD: requireRole('admin','hr') */
function requireRole(...vaiTroChoPhep) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Chưa đăng nhập' });
    if (!vaiTroChoPhep.includes(req.user.role)) {
      return res.status(403).json({ message: 'Không đủ quyền thực hiện thao tác này' });
    }
    next();
  };
}

module.exports = { xacThuc, requireRole };
