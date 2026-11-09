const { getPool, sql } = require('../db');
const logger = require('./logger');

/**
 * Chạy sp_DongBoNhanVien: áp dụng các thay đổi có NGÀY HIỆU LỰC (điều chuyển, nghỉ việc) khi tới hạn.
 * Gọi ngay sau khi sửa dữ liệu, và chạy lại mỗi giờ để thay đổi hẹn trong tương lai tự có tác dụng.
 */
async function dongBoNhanVien(nhanVienId = null) {
  const pool = await getPool();
  await pool.request().input('NhanVienId', sql.Int, nhanVienId).execute('sp_DongBoNhanVien');
}

function batDauLichDongBo(phut = 60) {
  const chay = () => dongBoNhanVien().catch((e) => logger.error('Đồng bộ nhân viên thất bại', { message: e.message }));
  chay();
  const t = setInterval(chay, phut * 60 * 1000);
  t.unref?.(); // không giữ tiến trình sống chỉ vì bộ hẹn giờ này
  return t;
}

module.exports = { dongBoNhanVien, batDauLichDongBo };
