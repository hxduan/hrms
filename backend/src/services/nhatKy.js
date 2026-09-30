const { getPool } = require('../db');

/**
 * Ghi nhật ký thay đổi — chỉ ghi những CỘT THỰC SỰ ĐỔI giá trị, không ghi
 * toàn bộ bản ghi. Gọi hàm này ở MỌI route PUT/DELETE (soft delete) trong
 * toàn hệ thống, không viết logic ghi log riêng lẻ ở từng route.
 *
 * @param {string} tenBang - Tên bảng, VD 'PhongBan', 'NhanVien'
 * @param {number} banGhiId - Id của bản ghi bị thay đổi
 * @param {object} duLieuCu - Object dữ liệu TRƯỚC khi sửa (lấy bằng SELECT trước UPDATE)
 * @param {object} duLieuMoi - Object dữ liệu SAU khi sửa
 * @param {number} nguoiThucHienId - TaiKhoan.Id của người thực hiện (req.user.id)
 */
async function ghiNhatKyThayDoi(tenBang, banGhiId, duLieuCu, duLieuMoi, nguoiThucHienId) {
  const pool = await getPool();
  const cacCotThayDoi = Object.keys(duLieuMoi).filter(
    (key) => String(duLieuCu[key] ?? '') !== String(duLieuMoi[key] ?? '')
  );

  for (const cot of cacCotThayDoi) {
    await pool
      .request()
      .input('tenBang', tenBang)
      .input('banGhiId', banGhiId)
      .input('tenCot', cot)
      .input('giaTriCu', String(duLieuCu[cot] ?? ''))
      .input('giaTriMoi', String(duLieuMoi[cot] ?? ''))
      .input('nguoiThucHienId', nguoiThucHienId)
      .query(
        `INSERT INTO NhatKyThayDoi
         (TenBang, BanGhiId, TenCot, GiaTriCu, GiaTriMoi, NguoiThucHienId)
         VALUES (@tenBang, @banGhiId, @tenCot, @giaTriCu, @giaTriMoi, @nguoiThucHienId)`
      );
  }
}

module.exports = { ghiNhatKyThayDoi };
