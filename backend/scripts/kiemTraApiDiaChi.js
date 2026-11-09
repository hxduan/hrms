require('dotenv').config();
const { layTinh, layPhuongXa } = require('../src/services/diaChi');

/**
 * Kiểm tra API địa chỉ đang hoạt động và xem cấu trúc trả về:   node scripts/kiemTraApiDiaChi.js
 * Đặt DIA_CHI_API_URL trong .env nếu nguồn dùng đường dẫn khác (mặc định https://provinces.open-api.vn/api/v2).
 */
(async () => {
  console.log('Nguồn:', process.env.DIA_CHI_API_URL || 'https://provinces.open-api.vn/api/v2 (mặc định)');
  const tinh = await layTinh();
  console.log(`Số tỉnh/thành: ${tinh.length}. Mẫu:`, tinh.slice(0, 3));
  const px = await layPhuongXa(tinh[0].ma);
  console.log(`Số phường/xã của "${tinh[0].ten}": ${px.length}. Mẫu:`, px.slice(0, 3));
  console.log('OK — cấu trúc API khớp mong đợi.');
  process.exit(0);
})().catch((e) => {
  console.error('LỖI:', e.message);
  console.error('Gợi ý: mở https://provinces.open-api.vn/ xem tài liệu phiên bản mới và đặt DIA_CHI_API_URL cho đúng.');
  process.exit(1);
});
