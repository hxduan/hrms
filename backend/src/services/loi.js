/** Tạo lỗi nghiệp vụ có mã HTTP — middleware xuLyLoi sẽ trả đúng status + message. */
function loiNghiepVu(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/** Đọc :id trên URL, ném 400 nếu không phải số nguyên dương. */
function layId(req, ten = 'id') {
  const id = Number(req.params[ten]);
  if (!Number.isInteger(id) || id <= 0) throw loiNghiepVu(400, 'Id không hợp lệ');
  return id;
}

/** Chuẩn hóa từ khóa tìm kiếm cho LIKE của SQL Server (thoát % _ [). */
function thoatTuKhoaLike(tuKhoa) {
  const t = (tuKhoa ?? '').toString().trim();
  if (!t) return null;
  return t.replace(/[%_[]/g, (m) => `[${m}]`);
}

module.exports = { loiNghiepVu, layId, thoatTuKhoaLike };
