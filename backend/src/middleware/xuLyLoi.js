const logger = require('../services/logger');

function xuLyLoi(err, req, res, next) {
  logger.error(err.message, { stack: err.stack, path: req.path });

  if (err.number === 2627 || err.number === 2601) {
    return res.status(409).json({ message: 'Dữ liệu đã tồn tại, không thể trùng' });
  }
  if (err.number === 547) {
    return res.status(409).json({ message: 'Dữ liệu đang được sử dụng ở nơi khác, không thể xóa/sửa' });
  }
  if (err.status) {
    return res.status(err.status).json({ message: err.message });
  }
  res.status(500).json({ message: 'Đã có lỗi xảy ra ở máy chủ' });
}

module.exports = { xuLyLoi };
