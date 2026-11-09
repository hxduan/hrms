/** Đọc tham số phân trang / sắp xếp từ query string. Hàm thuần, có test. */
function docPhanTrang(query, { soDongMacDinh = 20, toiDa = 200 } = {}) {
  const trang = Math.max(1, parseInt(query.trang, 10) || 1);
  const soDong = Math.min(toiDa, Math.max(1, parseInt(query.soDong, 10) || soDongMacDinh));
  return { trang, soDong };
}

/** Chỉ nhận cột nằm trong danh sách cho phép (chống chèn SQL qua tham số sắp xếp). */
function docSapXep(query, choPhep, macDinh) {
  const cot = choPhep.includes(query.sapXep) ? query.sapXep : macDinh;
  const huong = String(query.huong ?? '').toLowerCase() === 'desc' ? 'DESC' : 'ASC';
  return { cot, huong };
}

module.exports = { docPhanTrang, docSapXep };
