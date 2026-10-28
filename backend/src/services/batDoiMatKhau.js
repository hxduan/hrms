/**
 * Tài khoản vừa được admin/HR tạo hoặc đặt lại mật khẩu (mật khẩu TẠM) bị buộc đổi mật khẩu
 * trước khi dùng hệ thống. Khi cờ này bật, access token mang claim `bdm = true` và middleware
 * xacThuc chỉ cho gọi đúng các API dưới đây (xem thông tin mình + đổi mật khẩu).
 * Hàm thuần — có test riêng, không phụ thuộc DB.
 */
const DUOC_PHEP = [
  ['GET', '/auth/me'],
  ['POST', '/auth/doi-mat-khau'],
];

function choPhepKhiBatDoiMatKhau(method, url) {
  const duongDan = String(url ?? '').split('?')[0].replace(/\/+$/, '');
  const phuongThuc = String(method ?? '').toUpperCase();
  return DUOC_PHEP.some(([m, p]) => m === phuongThuc && p === duongDan);
}

module.exports = { choPhepKhiBatDoiMatKhau };
