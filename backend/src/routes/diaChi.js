const express = require('express');
const { xacThuc } = require('../middleware/auth');
const { layTinh, layPhuongXa } = require('../services/diaChi');

const router = express.Router();

// Danh mục địa chỉ (mô hình 2 cấp) — gọi qua backend có lưu đệm 24 giờ để giao diện không phụ thuộc mạng ngoài.
// Nếu API ngoài lỗi sẽ trả 502 kèm thông báo; giao diện cho phép nhập tay.
router.get('/tinh', xacThuc, async (req, res) => res.json(await layTinh()));
router.get('/phuong-xa', xacThuc, async (req, res) => res.json(await layPhuongXa(req.query.maTinh)));

module.exports = router;
