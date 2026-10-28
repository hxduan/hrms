const express = require('express');

const { getPool, sql } = require('../db');
const { xacThuc, requireRole } = require('../middleware/auth');
const { yeuCauDaGanHoSo } = require('../middleware/quyen');
const { validate } = require('../middleware/validate');
const { DinhBienTaoSchema, DinhBienSuaSchema } = require('../validation/toChuc');
const { XoaNhieuSchema } = require('../validation/chung');
const { ghiNhatKyThayDoi } = require('../services/nhatKy');
const { ghiNhatKyXoaCung } = require('../services/nhatKyXoa');
const { loiNghiepVu, layId } = require('../services/loi');

const router = express.Router();
const docDuoc = [xacThuc, yeuCauDaGanHoSo];
const ghiDuoc = [xacThuc, requireRole('admin', 'hr')];

async function layDinhBien(pool, id) {
  const r = await pool
    .request()
    .input('id', id)
    .query('SELECT Id, PhongBanId, ChucDanhId, Nam, SoLuongDuocDuyet, GhiChu FROM DinhBienViTri WHERE Id = @id');
  return r.recordset[0] ?? null;
}

async function soDangGiu(pool, phongBanId, chucDanhId) {
  const r = await pool
    .request()
    .input('pb', phongBanId)
    .input('cd', chucDanhId)
    .query(
      `SELECT COUNT(*) AS cnt FROM NhanVien
       WHERE PhongBanId = @pb AND ChucDanhId = @cd AND DangLamViec = 1 AND DaXoa = 0`
    );
  return r.recordset[0].cnt;
}

// ---- Danh sách + tình trạng định biên theo năm (stored procedure) ----------
// ?nam=2026 (mặc định năm hiện tại) &phongBanId=
router.get('/', ...docDuoc, async (req, res) => {
  const nam = req.query.nam ? Number(req.query.nam) : new Date().getFullYear();
  if (!Number.isInteger(nam) || nam < 2000 || nam > 2100) throw loiNghiepVu(400, 'Năm không hợp lệ');
  const pb = req.query.phongBanId ? Number(req.query.phongBanId) : null;
  if (pb !== null && !Number.isInteger(pb)) throw loiNghiepVu(400, 'phongBanId không hợp lệ');

  const pool = await getPool();
  const r = await pool
    .request()
    .input('Nam', sql.Int, nam)
    .input('PhongBanId', sql.Int, pb)
    .execute('sp_BaoCaoDinhBien');
  res.json(r.recordset);
});

// ---- Thêm ------------------------------------------------------------------
router.post('/', ...ghiDuoc, validate(DinhBienTaoSchema), async (req, res) => {
  const d = req.body;
  const pool = await getPool();

  const pb = await pool.request().input('id', d.PhongBanId).query('SELECT 1 AS x FROM PhongBan WHERE Id = @id AND DaXoa = 0');
  if (!pb.recordset[0]) return res.status(400).json({ message: 'Phòng ban không tồn tại hoặc đã bị xóa', truong: 'PhongBanId' });
  const cd = await pool.request().input('id', d.ChucDanhId).query('SELECT 1 AS x FROM ChucDanh WHERE Id = @id AND DaXoa = 0');
  if (!cd.recordset[0]) return res.status(400).json({ message: 'Chức danh không tồn tại hoặc đã bị xóa', truong: 'ChucDanhId' });

  const trung = await pool
    .request()
    .input('pb', d.PhongBanId)
    .input('cd', d.ChucDanhId)
    .input('nam', d.Nam)
    .query('SELECT 1 AS x FROM DinhBienViTri WHERE PhongBanId = @pb AND ChucDanhId = @cd AND Nam = @nam');
  if (trung.recordset[0]) {
    return res.status(409).json({
      message: `Đã có định biên cho phòng ban + chức danh này trong năm ${d.Nam}, hãy sửa bản ghi đó`,
      truong: 'ChucDanhId',
    });
  }

  const r = await pool
    .request()
    .input('pb', sql.Int, d.PhongBanId)
    .input('cd', sql.Int, d.ChucDanhId)
    .input('nam', sql.Int, d.Nam)
    .input('sl', sql.Int, d.SoLuongDuocDuyet)
    .input('ghiChu', sql.NVarChar(300), d.GhiChu)
    .query(
      `INSERT INTO DinhBienViTri (PhongBanId, ChucDanhId, Nam, SoLuongDuocDuyet, GhiChu)
       OUTPUT INSERTED.Id, INSERTED.PhongBanId, INSERTED.ChucDanhId, INSERTED.Nam,
              INSERTED.SoLuongDuocDuyet, INSERTED.GhiChu
       VALUES (@pb, @cd, @nam, @sl, @ghiChu)`
    );
  res.status(201).json(r.recordset[0]);
});

// ---- Sửa: chỉ số lượng + ghi chú (đổi phòng ban/chức danh/năm = định biên khác) ----
router.put('/:id', ...ghiDuoc, validate(DinhBienSuaSchema), async (req, res) => {
  const id = layId(req);
  const d = req.body;
  const pool = await getPool();
  const cu = await layDinhBien(pool, id);
  if (!cu) throw loiNghiepVu(404, 'Không tìm thấy định biên');

  await pool
    .request()
    .input('id', sql.Int, id)
    .input('sl', sql.Int, d.SoLuongDuocDuyet)
    .input('ghiChu', sql.NVarChar(300), d.GhiChu)
    .query('UPDATE DinhBienViTri SET SoLuongDuocDuyet = @sl, GhiChu = @ghiChu WHERE Id = @id');
  await ghiNhatKyThayDoi('DinhBienViTri', id, cu, d, req.user.id);

  // Không chặn: thực tế có thể đang dư người so với định biên mới, nhưng phải báo rõ cho HR biết
  const dangGiu = await soDangGiu(pool, cu.PhongBanId, cu.ChucDanhId);
  const canhBao =
    d.SoLuongDuocDuyet < dangGiu
      ? `Định biên mới (${d.SoLuongDuocDuyet}) thấp hơn số nhân viên đang giữ vị trí này (${dangGiu}).`
      : null;
  res.json({ message: 'Đã cập nhật định biên', Id: id, ...d, canhBao });
});

// ---- Xóa CỨNG (bảng kế hoạch, không có DaXoa) — có ghi nhật ký nội dung trước khi xóa ----
async function xoaMotDinhBien(pool, id, nguoiId) {
  const cu = await layDinhBien(pool, id);
  if (!cu) return false;
  await ghiNhatKyXoaCung('DinhBienViTri', id, cu, nguoiId);
  await pool.request().input('id', id).query('DELETE FROM DinhBienViTri WHERE Id = @id');
  return true;
}

router.post('/xoa-nhieu', ...ghiDuoc, validate(XoaNhieuSchema), async (req, res) => {
  const pool = await getPool();
  const daXoa = [];
  const khongXoaDuoc = [];
  for (const id of [...new Set(req.body.ids)]) {
    if (await xoaMotDinhBien(pool, id, req.user.id)) daXoa.push(id);
    else khongXoaDuoc.push({ id, lyDo: 'Không tồn tại hoặc đã bị xóa' });
  }
  if (daXoa.length === 0) return res.status(409).json({ message: 'Không xóa được mục nào', daXoa, khongXoaDuoc });
  res.json({ message: `Đã xóa ${daXoa.length} định biên`, daXoa, khongXoaDuoc });
});

router.delete('/:id', ...ghiDuoc, async (req, res) => {
  const pool = await getPool();
  if (!(await xoaMotDinhBien(pool, layId(req), req.user.id))) throw loiNghiepVu(404, 'Không tìm thấy định biên');
  res.json({ message: 'Đã xóa định biên' });
});

module.exports = router;
