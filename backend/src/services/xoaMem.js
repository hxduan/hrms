const { ghiNhatKyThayDoi } = require('./nhatKy');

// Tên bảng đi vào câu SQL => chỉ cho phép danh sách cố định này (không bao giờ
// lấy từ request) để loại trừ SQL injection.
const BANG_XOA_MEM = new Set(['PhongBan', 'ChucVu', 'ChucDanh']);

async function xoaMem(pool, bang, id, nguoiThucHienId) {
  if (!BANG_XOA_MEM.has(bang)) throw new Error(`Bảng không hỗ trợ xóa mềm: ${bang}`);
  await pool.request().input('id', id).query(`UPDATE ${bang} SET DaXoa = 1 WHERE Id = @id`);
  await ghiNhatKyThayDoi(bang, id, { DaXoa: 0 }, { DaXoa: 1 }, nguoiThucHienId);
}

module.exports = { xoaMem };
