/** Bỏ dấu tiếng Việt + về chữ thường — để tìm "ke toan" ra "Kế toán". */
export const boDau = (s) =>
  (s ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();

export const chuaChuoi = (nguon, tuKhoa) => boDau(nguon).includes(boDau(tuKhoa).trim());

export const dinhDangNgay = (v) => (v ? new Date(v).toLocaleDateString('vi-VN') : '—');
