const express = require('express');

const { getPool, sql } = require('../db');
const { xacThuc, requireRole } = require('../middleware/auth');
const { yeuCauDaGanHoSo } = require('../middleware/quyen');
const { validate } = require('../middleware/validate');
const { ChucDanhSchema } = require('../validation/toChuc');
const { XoaNhieuSchema } = require('../validation/chung');
const { ghiNhatKyThayDoi } = require('../services/nhatKy');
const { xoaMem } = require('../services/xoaMem');
const { xoaNhieuTheoLuot } = require('../services/xoaNhieu');
const { loiNghiepVu, layId } = require('../services/loi');

const router = express.Router();
const docDuoc = [xacThuc, yeuCauDaGanHoSo];
const ghiDuoc = [xacThuc, requireRole('admin', 'hr')];

async function layChucDanh(pool, id) {
  const r = await pool.request().input('id', id).query('SELECT Id, Ten FROM ChucDanh WHERE Id = @id AND DaXoa = 0');
  return r.recordset[0] ?? null;
}

async function trungTen(pool, Ten, boQuaId) {
  const r = await pool
    .request()
    .input('ten', sql.NVarChar(200), Ten)
    .input('boQua', sql.Int, boQuaId ?? 0)
    .query('SELECT TOP 1 Id FROM ChucDanh WHERE DaXoa = 0 AND Ten = @ten AND Id <> @boQua');
  return !!r.recordset[0];
}

async function kiemTraDuocXoa(pool, id) {
  const cd = await layChucDanh(pool, id);
  if (!cd) return { ten: null, lyDo: 'Không tồn tại hoặc đã bị xóa' };
  const r = await pool
    .request()
    .input('id', id)
    .query(
      `SELECT (SELECT COUNT(*) FROM NhanVien WHERE ChucDanhId = @id AND DangLamViec = 1 AND DaXoa = 0) AS NhanVien,
              (SELECT COUNT(*) FROM DinhBienViTri WHERE ChucDanhId = @id) AS DinhBien`
    );
  const d = r.recordset[0];
  const chan = [];
  if (d.NhanVien) chan.push(`${d.NhanVien} nhân viên đang giữ chức danh này`);
  if (d.DinhBien) chan.push(`${d.DinhBien} dòng định biên`);
  return { ten: cd.Ten, lyDo: chan.length ? `Còn ${chan.join(', ')}` : null };
}

router.get('/', ...docDuoc, async (req, res) => {
  const pool = await getPool();
  const r = await pool.request().query(
    `SELECT cd.Id, cd.Ten,
            (SELECT COUNT(*) FROM NhanVien nv
               WHERE nv.ChucDanhId = cd.Id AND nv.DangLamViec = 1 AND nv.DaXoa = 0) AS SoNhanVien,
            (SELECT COUNT(*) FROM DinhBienViTri db WHERE db.ChucDanhId = cd.Id) AS SoDinhBien
     FROM ChucDanh cd
     WHERE cd.DaXoa = 0
     ORDER BY cd.Ten`
  );
  res.json(r.recordset);
});

router.get('/kiem-tra', ...ghiDuoc, async (req, res) => {
  const { giaTri } = req.query;
  if (!giaTri) return res.json({ daTonTai: false });
  const boQua = req.query.boQuaId ? Number(req.query.boQuaId) : null;
  const trung = await trungTen(await getPool(), giaTri.toString().trim(), boQua);
  res.json({ daTonTai: trung, message: trung ? 'Chức danh này đã tồn tại' : null });
});

router.post('/', ...ghiDuoc, validate(ChucDanhSchema), async (req, res) => {
  const pool = await getPool();
  if (await trungTen(pool, req.body.Ten, null)) {
    return res.status(409).json({ message: `Chức danh "${req.body.Ten}" đã tồn tại`, truong: 'Ten' });
  }
  const r = await pool
    .request()
    .input('ten', sql.NVarChar(200), req.body.Ten)
    .query('INSERT INTO ChucDanh (Ten) OUTPUT INSERTED.Id, INSERTED.Ten VALUES (@ten)');
  res.status(201).json(r.recordset[0]);
});

router.put('/:id', ...ghiDuoc, validate(ChucDanhSchema), async (req, res) => {
  const id = layId(req);
  const pool = await getPool();
  const cu = await layChucDanh(pool, id);
  if (!cu) throw loiNghiepVu(404, 'Không tìm thấy chức danh');
  if (await trungTen(pool, req.body.Ten, id)) {
    return res.status(409).json({ message: `Chức danh "${req.body.Ten}" đã tồn tại`, truong: 'Ten' });
  }
  await pool
    .request()
    .input('id', sql.Int, id)
    .input('ten', sql.NVarChar(200), req.body.Ten)
    .query('UPDATE ChucDanh SET Ten = @ten WHERE Id = @id');
  await ghiNhatKyThayDoi('ChucDanh', id, cu, req.body, req.user.id);
  res.json({ message: 'Đã cập nhật chức danh', Id: id, ...req.body });
});

router.post('/xoa-nhieu', ...ghiDuoc, validate(XoaNhieuSchema), async (req, res) => {
  const pool = await getPool();
  const kq = await xoaNhieuTheoLuot(
    req.body.ids,
    (id) => kiemTraDuocXoa(pool, id),
    (id) => xoaMem(pool, 'ChucDanh', id, req.user.id)
  );
  if (kq.daXoa.length === 0) return res.status(409).json({ message: 'Không xóa được mục nào', ...kq });
  res.json({ message: `Đã xóa ${kq.daXoa.length} chức danh`, ...kq });
});

router.delete('/:id', ...ghiDuoc, async (req, res) => {
  const id = layId(req);
  const pool = await getPool();
  const kq = await kiemTraDuocXoa(pool, id);
  if (kq.ten === null) throw loiNghiepVu(404, 'Không tìm thấy chức danh');
  if (kq.lyDo) return res.status(409).json({ message: `Không thể xóa chức danh "${kq.ten}": ${kq.lyDo}` });
  await xoaMem(pool, 'ChucDanh', id, req.user.id);
  res.json({ message: `Đã xóa chức danh "${kq.ten}"` });
});

module.exports = router;
