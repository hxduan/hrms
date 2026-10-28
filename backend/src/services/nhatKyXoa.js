const { getPool } = require('../db');

/**
 * Bảng định biên dùng XÓA CỨNG (không có cột DaXoa) nên phải ghi lại nội dung
 * bản ghi trước khi mất. Lưu 1 dòng nhật ký: TenCot = '__XOA__', GiaTriCu = JSON.
 */
async function ghiNhatKyXoaCung(tenBang, banGhiId, duLieuCu, nguoiThucHienId) {
  const pool = await getPool();
  await pool
    .request()
    .input('tenBang', tenBang)
    .input('banGhiId', banGhiId)
    .input('giaTriCu', JSON.stringify(duLieuCu))
    .input('nguoi', nguoiThucHienId)
    .query(
      `INSERT INTO NhatKyThayDoi (TenBang, BanGhiId, TenCot, GiaTriCu, GiaTriMoi, NguoiThucHienId)
       VALUES (@tenBang, @banGhiId, '__XOA__', @giaTriCu, NULL, @nguoi)`
    );
}

module.exports = { ghiNhatKyXoaCung };
