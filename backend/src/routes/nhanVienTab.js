const express = require('express');
const { getPool, sql } = require('../db');
const { xacThuc, requireRole } = require('../middleware/auth');
const { yeuCauDaGanHoSo } = require('../middleware/quyen');
const { validate } = require('../middleware/validate');
const { ghiNhatKyThayDoi } = require('../services/nhatKy');
const { loiNghiepVu, layId } = require('../services/loi');

/**
 * Xác định nhân viên mà request nhắm tới và kiểm tra quyền:
 *  - admin/hr: đọc/ghi mọi nhân viên (`:nhanVienId` là số); `toi` = hồ sơ gắn với tài khoản của chính họ (chỉ đọc)
 *  - nhân viên: CHỈ ĐỌC dữ liệu của chính mình. "Mình" luôn lấy từ tài khoản (DB), không tin id gửi lên.
 */
async function xacDinhNhanVien(req, pool, { chiDoc }) {
  const p = req.params.nhanVienId;
  let id;
  if (p === 'toi') {
    if (!chiDoc) throw loiNghiepVu(400, 'Không thể ghi dữ liệu qua đường dẫn "toi"');
    id = req.user.employeeId;
    if (!id) {
      const r = await pool.request().input('t', req.user.id).query('SELECT NhanVienId FROM TaiKhoan WHERE Id = @t');
      id = r.recordset[0]?.NhanVienId;
    }
    if (!id) throw loiNghiepVu(404, 'Tài khoản chưa được gắn hồ sơ nhân viên');
  } else {
    id = Number(p);
    if (!Number.isInteger(id) || id <= 0) throw loiNghiepVu(400, 'Mã nhân viên không hợp lệ');
    if (req.user.role === 'nhan_vien' && id !== req.user.employeeId) {
      throw loiNghiepVu(403, 'Bạn chỉ được xem dữ liệu của chính mình');
    }
  }
  const ton = await pool.request().input('id', id).query('SELECT 1 AS x FROM NhanVien WHERE Id = @id AND DaXoa = 0');
  if (!ton.recordset[0]) throw loiNghiepVu(404, 'Không tìm thấy nhân viên');
  return id;
}

const traLoi = (res, loi) => res.status(loi.status ?? 409).json(loi.body ?? { message: loi.message, truong: loi.truong });

/**
 * Tạo router CRUD cho một "tab" thuộc hồ sơ nhân viên (hợp đồng, quá trình công tác, phụ cấp, người phụ thuộc).
 *  cauHinh: {
 *    bang, schema,
 *    cot:   [{ ten, kieu }]            các cột được ghi (kiểu của mssql)
 *    chon:  { cot, noi }               phần SELECT (alias t) và JOIN; ngày PHẢI CONVERT(VARCHAR(10), ..., 23) để khỏi lệch múi giờ
 *    sapXep,
 *    truocKhiLuu(pool, { nhanVienId, du, id, nguoi })  -> null | { status, message, truong } | { status, body }
 *    sauKhiLuu(pool, ctx), sauKhiXoa(pool, ctx)
 *  }
 */
function taoRouterTab(cauHinh) {
  const { bang, schema, cot, chon, sapXep, truocKhiLuu, sauKhiLuu, sauKhiXoa } = cauHinh;
  const router = express.Router({ mergeParams: true });
  const ghi = [xacThuc, requireRole('admin', 'hr')];
  const doc = [xacThuc, yeuCauDaGanHoSo];

  const sqlChon = (them = '') =>
    `SELECT ${chon.cot} FROM ${bang} t ${chon.noi ?? ''} WHERE t.NhanVienId = @nv AND t.DaXoa = 0 ${them}`;

  async function layMot(pool, nhanVienId, id) {
    const r = await pool.request().input('nv', nhanVienId).input('id', id).query(sqlChon('AND t.Id = @id'));
    return r.recordset[0] ?? null;
  }
  const layGiaTri = (du) => Object.fromEntries(cot.map((c) => [c.ten, du[c.ten]]));

  router.get('/', ...doc, async (req, res) => {
    const pool = await getPool();
    const nv = await xacDinhNhanVien(req, pool, { chiDoc: true });
    const r = await pool.request().input('nv', nv).query(`${sqlChon()} ORDER BY ${sapXep}`);
    res.json(r.recordset);
  });

  router.post('/', ...ghi, validate(schema), async (req, res) => {
    const pool = await getPool();
    const nhanVienId = await xacDinhNhanVien(req, pool, { chiDoc: false });
    const du = req.body;
    const loi = await truocKhiLuu?.(pool, { nhanVienId, du, id: null, nguoi: req.user });
    if (loi) return traLoi(res, loi);

    const rq = pool.request().input('nv', sql.Int, nhanVienId);
    cot.forEach((c) => rq.input(c.ten, c.kieu, du[c.ten]));
    const r = await rq.query(
      `INSERT INTO ${bang} (NhanVienId, ${cot.map((c) => c.ten).join(', ')})
       OUTPUT INSERTED.Id
       VALUES (@nv, ${cot.map((c) => '@' + c.ten).join(', ')})`
    );
    const id = r.recordset[0].Id;
    await sauKhiLuu?.(pool, { nhanVienId, du, id, nguoi: req.user });
    res.status(201).json(await layMot(pool, nhanVienId, id));
  });

  router.put('/:id', ...ghi, validate(schema), async (req, res) => {
    const id = layId(req);
    const pool = await getPool();
    const nhanVienId = await xacDinhNhanVien(req, pool, { chiDoc: false });
    const cu = await layMot(pool, nhanVienId, id);
    if (!cu) throw loiNghiepVu(404, 'Không tìm thấy bản ghi');
    const du = req.body;
    const loi = await truocKhiLuu?.(pool, { nhanVienId, du, id, nguoi: req.user });
    if (loi) return traLoi(res, loi);

    const rq = pool.request().input('id', sql.Int, id).input('nv', sql.Int, nhanVienId);
    cot.forEach((c) => rq.input(c.ten, c.kieu, du[c.ten]));
    await rq.query(
      `UPDATE ${bang} SET ${cot.map((c) => `${c.ten} = @${c.ten}`).join(', ')} WHERE Id = @id AND NhanVienId = @nv`
    );
    await ghiNhatKyThayDoi(bang, id, cu, layGiaTri(du), req.user.id);
    await sauKhiLuu?.(pool, { nhanVienId, du, id, nguoi: req.user });
    res.json(await layMot(pool, nhanVienId, id));
  });

  router.delete('/:id', ...ghi, async (req, res) => {
    const id = layId(req);
    const pool = await getPool();
    const nhanVienId = await xacDinhNhanVien(req, pool, { chiDoc: false });
    const cu = await layMot(pool, nhanVienId, id);
    if (!cu) throw loiNghiepVu(404, 'Không tìm thấy bản ghi');
    await pool.request().input('id', sql.Int, id).query(`UPDATE ${bang} SET DaXoa = 1 WHERE Id = @id`);
    await ghiNhatKyThayDoi(bang, id, { DaXoa: 0 }, { DaXoa: 1 }, req.user.id);
    await sauKhiXoa?.(pool, { nhanVienId, id, nguoi: req.user });
    res.json({ message: 'Đã xóa' });
  });

  return router;
}

module.exports = { taoRouterTab, xacDinhNhanVien, traLoi };
