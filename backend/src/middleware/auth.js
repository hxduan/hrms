const jwt = require('jsonwebtoken');

/** Xác thực JWT — gắn req.user = { id, role, employeeId } nếu hợp lệ */
function xacThuc(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Chưa đăng nhập' });
  }
  try {
    const token = authHeader.slice(7);
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
  }
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
