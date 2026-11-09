/** Đánh giá còn chỗ không. Thêm người chỉ được khi còn ít nhất một chỗ. */
function danhGiaDinhBien(soDuyet, dangGiu) {
  if (soDuyet === null || soDuyet === undefined) {
    return {
      coDinhBien: false,
      duocPhep: true,
      canhBao: 'Vị trí này chưa có định biên nên chưa kiểm soát được số lượng.',
    };
  }

  const conLai = soDuyet - dangGiu;
  if (conLai < 1) {
    return {
      coDinhBien: true,
      duocPhep: false,
      soDuyet,
      dangGiu,
      conLai,
      canhBao: `Vị trí đã đủ định biên (${dangGiu}/${soDuyet}). Cần được duyệt tăng định biên, hoặc xác nhận vượt kèm lý do.`,
    };
  }

  return { coDinhBien: true, duocPhep: true, soDuyet, dangGiu, conLai };
}

/**
 * Kiểm tra định biên và không tính nhân viên đang được điều chuyển vào vị trí mới.
 */
async function kiemTraConDinhBien(pool, phongBanId, chucDanhId, tuyChon = {}) {
  const { nam = new Date().getFullYear(), boQuaNhanVienId = 0 } =
    typeof tuyChon === 'number' ? { nam: tuyChon } : tuyChon;
  const r = await pool
    .request()
    .input('pb', phongBanId)
    .input('cd', chucDanhId)
    .input('nam', nam)
    .input('boQua', boQuaNhanVienId ?? 0)
    .query(
      `SELECT db.SoLuongDuocDuyet AS SoDuyet,
              (SELECT COUNT(*) FROM NhanVien nv
                 WHERE nv.PhongBanId = @pb AND nv.ChucDanhId = @cd
                   AND nv.DangLamViec = 1 AND nv.DaXoa = 0 AND nv.Id <> @boQua) AS DangGiu
       FROM DinhBienViTri db
       WHERE db.PhongBanId = @pb AND db.ChucDanhId = @cd AND db.Nam = @nam`
    );

  const dong = r.recordset[0];
  return danhGiaDinhBien(dong?.SoDuyet ?? null, dong?.DangGiu ?? 0);
}

module.exports = { kiemTraConDinhBien, danhGiaDinhBien };
