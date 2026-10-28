const express = require('express');

const { getPool, sql } = require('../db');
const { xacThuc, requireRole } = require('../middleware/auth');
const { yeuCauDaGanHoSo } = require('../middleware/quyen');
const { validate } = require('../middleware/validate');
const { ChucVuSchema } = require('../validation/toChuc');
const { XoaNhieuSchema } = require('../validation/chung');
const { ghiNhatKyThayDoi } = require('../services/nhatKy');
const { xoaMem } = require('../services/xoaMem');
const { xoaNhieuTheoLuot } = require('../services/xoaNhieu');
const { loiNghiepVu, layId } = require('../services/loi');

const router = express.Router();
const docDuoc = [xacThuc, yeuCauDaGanHoSo];
const ghiDuoc = [xacThuc, requireRole('admin', 'hr')];

async function layChucVu(pool, id) {
  const r = await pool
    .request()
    .input('id', id)
    .query('SELECT Id, Ten, PhongBanId, ThuTu FROM ChucVu WHERE Id = @id AND DaXoa = 0');
  return r.recordset[0] ?? null;
}

async function phongBanTonTai(pool, id) {
  const r = await pool.request().input('id', id).query('SELECT 1 AS x FROM PhongBan WHERE Id = @id AND DaXoa = 0');
  return !!r.recordset[0];
}

/** Chức vụ trùng tên trong cùng phòng ban (PhongBanId NULL = nhóm "dùng chung toàn công ty"). */
async function trungTen(pool, Ten, PhongBanId, boQuaId) {
  const r = await pool
    .request()
    .input('ten', sql.NVarChar(200), Ten)
    .input('pb', sql.Int, PhongBanId)
    .input('boQua', sql.Int, boQuaId ?? 0)
    .query(
      `SELECT TOP 1 Id FROM ChucVu
       WHERE DaXoa = 0 AND Ten = @ten AND Id <> @boQua
         AND ((PhongBanId IS NULL AND @pb IS NULL) OR PhongBanId = @pb)`
    );
  return !!r.recordset[0];
}

async function kiemTraDuocXoa(pool, id) {
  const cv = await layChucVu(pool, id);
  if (!cv) return { ten: null, lyDo: 'Không tồn tại hoặc đã bị xóa' };
  const r = await pool
    .request()
    .input('id', id)
    .query('SELECT COUNT(*) AS cnt FROM NhanVien WHERE ChucVuId = @id AND DangLamViec = 1 AND DaXoa = 0');
  const n = r.recordset[0].cnt;
  return { ten: cv.Ten, lyDo: n ? `Còn ${n} nhân viên đang giữ chức vụ này` : null };
}

// ---- Danh sách (lọc theo phòng ban: ?phongBanId= ; "0" = chỉ nhóm dùng chung) ----
router.get('/', ...docDuoc, async (req, res) => {
  const pool = await getPool();
  const loc = req.query.phongBanId;
  if (loc !== undefined && loc !== '' && loc !== '0' && !(Number.isInteger(Number(loc)) && Number(loc) > 0)) {
    throw loiNghiepVu(400, 'phongBanId không hợp lệ');
  }
  const r = await pool
    .request()
    .input('pb', sql.Int, loc && loc !== '0' ? Number(loc) : null)
    .query(
      `SELECT cv.Id, cv.Ten, cv.PhongBanId, pb.Ten AS TenPhongBan, cv.ThuTu,
              (SELECT COUNT(*) FROM NhanVien nv
                 WHERE nv.ChucVuId = cv.Id AND nv.DangLamViec = 1 AND nv.DaXoa = 0) AS SoNhanVien
       FROM ChucVu cv
       LEFT JOIN PhongBan pb ON pb.Id = cv.PhongBanId
       WHERE cv.DaXoa = 0
         ${loc === '0' ? 'AND cv.PhongBanId IS NULL' : '    AND (@pb IS NULL OR cv.PhongBanId = @pb)'}
       ORDER BY cv.ThuTu, cv.Ten`
    );
  res.json(r.recordset);
});

router.get('/kiem-tra', ...ghiDuoc, async (req, res) => {
  const { giaTri } = req.query;
  if (!giaTri) return res.json({ daTonTai: false });
  const pb = req.query.phongBanId ? Number(req.query.phongBanId) : null;
  const boQua = req.query.boQuaId ? Number(req.query.boQuaId) : null;
  const trung = await trungTen(await getPool(), giaTri.toString().trim(), pb, boQua);
  res.json({ daTonTai: trung, message: trung ? 'Đã có chức vụ này trong phòng ban đã chọn' : null });
});

router.post('/', ...ghiDuoc, validate(ChucVuSchema), async (req, res) => {
  const d = req.body;
  const pool = await getPool();
  if (d.PhongBanId && !(await phongBanTonTai(pool, d.PhongBanId))) {
    return res.status(400).json({ message: 'Phòng ban không tồn tại hoặc đã bị xóa', truong: 'PhongBanId' });
  }
  if (await trungTen(pool, d.Ten, d.PhongBanId, null)) {
    return res.status(409).json({ message: `Đã có chức vụ "${d.Ten}" trong phòng ban này`, truong: 'Ten' });
  }
  const r = await pool
    .request()
    .input('ten', sql.NVarChar(200), d.Ten)
    .input('pb', sql.Int, d.PhongBanId)
    .input('thuTu', sql.Int, d.ThuTu)
    .query(
      `INSERT INTO ChucVu (Ten, PhongBanId, ThuTu)
       OUTPUT INSERTED.Id, INSERTED.Ten, INSERTED.PhongBanId, INSERTED.ThuTu
       VALUES (@ten, @pb, @thuTu)`
    );
  res.status(201).json(r.recordset[0]);
});

router.put('/:id', ...ghiDuoc, validate(ChucVuSchema), async (req, res) => {
  const id = layId(req);
  const d = req.body;
  const pool = await getPool();
  const cu = await layChucVu(pool, id);
  if (!cu) throw loiNghiepVu(404, 'Không tìm thấy chức vụ');

  if (d.PhongBanId && !(await phongBanTonTai(pool, d.PhongBanId))) {
    return res.status(400).json({ message: 'Phòng ban không tồn tại hoặc đã bị xóa', truong: 'PhongBanId' });
  }
  if (await trungTen(pool, d.Ten, d.PhongBanId, id)) {
    return res.status(409).json({ message: `Đã có chức vụ "${d.Ten}" trong phòng ban này`, truong: 'Ten' });
  }
  await pool
    .request()
    .input('id', sql.Int, id)
    .input('ten', sql.NVarChar(200), d.Ten)
    .input('pb', sql.Int, d.PhongBanId)
    .input('thuTu', sql.Int, d.ThuTu)
    .query('UPDATE ChucVu SET Ten = @ten, PhongBanId = @pb, ThuTu = @thuTu WHERE Id = @id');

  await ghiNhatKyThayDoi('ChucVu', id, cu, d, req.user.id);
  res.json({ message: 'Đã cập nhật chức vụ', Id: id, ...d });
});

router.post('/xoa-nhieu', ...ghiDuoc, validate(XoaNhieuSchema), async (req, res) => {
  const pool = await getPool();
  const kq = await xoaNhieuTheoLuot(
    req.body.ids,
    (id) => kiemTraDuocXoa(pool, id),
    (id) => xoaMem(pool, 'ChucVu', id, req.user.id)
  );
  if (kq.daXoa.length === 0) return res.status(409).json({ message: 'Không xóa được mục nào', ...kq });
  res.json({ message: `Đã xóa ${kq.daXoa.length} chức vụ`, ...kq });
});

router.delete('/:id', ...ghiDuoc, async (req, res) => {
  const id = layId(req);
  const pool = await getPool();
  const kq = await kiemTraDuocXoa(pool, id);
  if (kq.ten === null) throw loiNghiepVu(404, 'Không tìm thấy chức vụ');
  if (kq.lyDo) return res.status(409).json({ message: `Không thể xóa chức vụ "${kq.ten}": ${kq.lyDo}` });
  await xoaMem(pool, 'ChucVu', id, req.user.id);
  res.json({ message: `Đã xóa chức vụ "${kq.ten}"` });
});

module.exports = router;
