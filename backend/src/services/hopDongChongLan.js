const VO_CUC = '9999-12-31'; // ngày kết thúc rỗng = không thời hạn

/**
 * Tìm các bản ghi có khoảng thời gian CHỒNG LẤN với `moi`. Ngày là chuỗi YYYY-MM-DD (so sánh chuỗi là đúng).
 * Hai khoảng [a1,a2] và [b1,b2] chồng nhau khi a1 <= b2 và b1 <= a2 (chạm đầu mút cũng tính là chồng).
 */
function timChongLan(danhSach, moi, { boQuaId = null, batDau = 'NgayBatDau', ketThuc = 'NgayKetThuc' } = {}) {
  const bd = moi[batDau];
  const kt = moi[ketThuc] || VO_CUC;
  return danhSach.filter((h) => h.Id !== boQuaId && h[batDau] <= kt && bd <= (h[ketThuc] || VO_CUC));
}

const moTaKhoang = (h, batDau = 'NgayBatDau', ketThuc = 'NgayKetThuc') =>
  `${h[batDau]} → ${h[ketThuc] || 'không thời hạn'}`;

module.exports = { timChongLan, moTaKhoang, VO_CUC };
