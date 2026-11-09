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

/** Định dạng ngày ISO bằng cách cắt chuỗi, tránh lệch ngày do múi giờ. */
export const ngayVN = (s) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s ?? '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '—';
};

export const tienVN = (n) =>
  n === null || n === undefined || n === '' ? '—' : `${new Intl.NumberFormat('vi-VN').format(Number(n))} ₫`;

export const homNayYMD = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Cộng ngày cho chuỗi ISO mà không phụ thuộc múi giờ địa phương. */
export const congNgay = (s, n) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
