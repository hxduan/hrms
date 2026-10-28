/**
 * Kiểm tra còn định biên cho (phòng ban, chức danh) trong năm hay không.
 * SẼ ĐƯỢC GỌI ở Giai đoạn 3 (thêm nhân viên) và Giai đoạn 4 (chuyển vị trí).
 * Trả về cảnh báo chứ không chặn cứng — HR quyết định có vượt định biên hay không.
 */
async function kiemTraConDinhBien(pool, phongBanId, chucDanhId, nam = new Date().getFullYear()) {
  const r = await pool
    .request()
    .input('pb', phongBanId)
    .input('cd', chucDanhId)
    .input('nam', nam)
    .query(
      `SELECT SoLuongDuocDuyet, SoLuongDangGiu, ConLai
       FROM View_TinhTrangDinhBien
       WHERE PhongBanId = @pb AND ChucDanhId = @cd AND Nam = @nam`
    );
  const dong = r.recordset[0];
  if (!dong) {
    return { coDinhBien: false, duocPhep: true, canhBao: 'Vị trí này chưa có định biên, chưa kiểm soát được số lượng.' };
  }
  if (dong.ConLai <= 0) {
    return {
      coDinhBien: true,
      duocPhep: false,
      canhBao: `Đã đủ định biên (${dong.SoLuongDangGiu}/${dong.SoLuongDuocDuyet}). Cần xin duyệt tăng định biên trước khi bổ sung.`,
    };
  }
  return { coDinhBien: true, duocPhep: true, conLai: dong.ConLai };
}

module.exports = { kiemTraConDinhBien };
