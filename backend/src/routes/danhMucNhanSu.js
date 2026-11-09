const express = require('express');
const { getPool, sql } = require('../db');
const { xacThuc, requireRole } = require('../middleware/auth');
const { yeuCauDaGanHoSo } = require('../middleware/quyen');
const { validate } = require('../middleware/validate');
const { LoaiHopDongSchema, LyDoNghiViecSchema } = require('../validation/nhanSu');
const { ghiNhatKyThayDoi } = require('../services/nhatKy');
const { loiNghiepVu, layId } = require('../services/loi');

const doc = [xacThuc, yeuCauDaGanHoSo];
const ghi = [xacThuc, requireRole('admin', 'hr')];

/** Router CRUD (xóa mềm) cho 1 bảng danh mục nhỏ. `dangDung` = câu SQL đếm bản ghi còn dùng danh mục này (tham số @id). */
function taoRouterDanhMuc({ bang, nhan, schema, cot, dangDung }) {
  const router = express.Router();
  const danhSachCot = ['Id', ...cot.map((c) => c.ten)].join(', ');

  const lay = async (pool, id) => (await pool.request().input('id', id).query(`SELECT ${danhSachCot} FROM ${bang} WHERE Id = @id AND DaXoa = 0`)).recordset[0] ?? null;
  const trung = async (pool, ten, boQua) =>
    !!(await pool.request().input('ten', sql.NVarChar(200), ten).input('boQua', boQua ?? 0)
      .query(`SELECT 1 AS x FROM ${bang} WHERE Ten = @ten AND DaXoa = 0 AND Id <> @boQua`)).recordset[0];

  router.get('/', ...doc, async (req, res) => {
    const pool = await getPool();
    const r = await pool.request().query(`SELECT ${danhSachCot}, (${dangDung.replace('@id', `${bang}.Id`)}) AS SoDangDung FROM ${bang} WHERE DaXoa = 0 ORDER BY Ten`);
    res.json(r.recordset);
  });

  router.post('/', ...ghi, validate(schema), async (req, res) => {
    const pool = await getPool();
    const d = req.body;
    if (await trung(pool, d.Ten, null)) return res.status(409).json({ message: `${nhan} "${d.Ten}" đã tồn tại`, truong: 'Ten' });
    const rq = pool.request();
    cot.forEach((c) => rq.input(c.ten, c.kieu, d[c.ten]));
    const r = await rq.query(`INSERT INTO ${bang} (${cot.map((c) => c.ten).join(', ')}) OUTPUT INSERTED.Id VALUES (${cot.map((c) => '@' + c.ten).join(', ')})`);
    res.status(201).json(await lay(pool, r.recordset[0].Id));
  });

  router.put('/:id', ...ghi, validate(schema), async (req, res) => {
    const id = layId(req);
    const pool = await getPool();
    const cu = await lay(pool, id);
    if (!cu) throw loiNghiepVu(404, `Không tìm thấy ${nhan.toLowerCase()}`);
    const d = req.body;
    if (await trung(pool, d.Ten, id)) return res.status(409).json({ message: `${nhan} "${d.Ten}" đã tồn tại`, truong: 'Ten' });
    const rq = pool.request().input('id', sql.Int, id);
    cot.forEach((c) => rq.input(c.ten, c.kieu, d[c.ten]));
    await rq.query(`UPDATE ${bang} SET ${cot.map((c) => `${c.ten} = @${c.ten}`).join(', ')} WHERE Id = @id`);
    await ghiNhatKyThayDoi(bang, id, cu, Object.fromEntries(cot.map((c) => [c.ten, d[c.ten]])), req.user.id);
    res.json(await lay(pool, id));
  });

  router.delete('/:id', ...ghi, async (req, res) => {
    const id = layId(req);
    const pool = await getPool();
    const cu = await lay(pool, id);
    if (!cu) throw loiNghiepVu(404, `Không tìm thấy ${nhan.toLowerCase()}`);
    const n = (await pool.request().input('id', id).query(`SELECT (${dangDung}) AS n`)).recordset[0].n;
    if (n > 0) return res.status(409).json({ message: `Không thể xóa "${cu.Ten}": đang được dùng ở ${n} bản ghi` });
    await pool.request().input('id', sql.Int, id).query(`UPDATE ${bang} SET DaXoa = 1 WHERE Id = @id`);
    await ghiNhatKyThayDoi(bang, id, { DaXoa: 0 }, { DaXoa: 1 }, req.user.id);
    res.json({ message: `Đã xóa "${cu.Ten}"` });
  });

  return router;
}

const loaiHopDong = taoRouterDanhMuc({
  bang: 'LoaiHopDong', nhan: 'Loại hợp đồng', schema: LoaiHopDongSchema,
  cot: [{ ten: 'Ten', kieu: sql.NVarChar(100) }, { ten: 'CoDongBaoHiem', kieu: sql.Bit }, { ten: 'KieuTinhThue', kieu: sql.NVarChar(12) }],
  dangDung: 'SELECT COUNT(*) FROM HopDong WHERE LoaiHopDongId = @id AND DaXoa = 0',
});
const lyDoNghiViec = taoRouterDanhMuc({
  bang: 'LyDoNghiViec', nhan: 'Lý do nghỉ việc', schema: LyDoNghiViecSchema,
  cot: [{ ten: 'Ten', kieu: sql.NVarChar(200) }],
  dangDung: 'SELECT COUNT(*) FROM NghiViec WHERE LyDoNghiViecId = @id',
});

module.exports = { loaiHopDong, lyDoNghiViec };
