const express = require('express');

const { getPool, sql } = require('../db');
const { xacThuc, requireRole } = require('../middleware/auth');
const { yeuCauDaGanHoSo } = require('../middleware/quyen');
const { validate } = require('../middleware/validate');
const { PhongBanSchema } = require('../validation/toChuc');
const { XoaNhieuSchema } = require('../validation/chung');
const { ghiNhatKyThayDoi } = require('../services/nhatKy');
const { xoaMem } = require('../services/xoaMem');
const { xoaNhieuTheoLuot } = require('../services/xoaNhieu');
const { loiNghiepVu, layId, thoatTuKhoaLike } = require('../services/loi');

const router = express.Router();
const docDuoc = [xacThuc, yeuCauDaGanHoSo]; // admin, hr, nhân viên đã gắn hồ sơ
const ghiDuoc = [xacThuc, requireRole('admin', 'hr')];

// ---------------------------------------------------------------------------
// Hàm dùng chung
// ---------------------------------------------------------------------------

/** Phòng ban `x` có nằm trong cây con (con, cháu, chắt...) của phòng ban `id` không? */
async function laConChauCua(pool, x, id) {
  const r = await pool
    .request()
    .input('id', id)
    .input('x', x)
    .query(
      `;WITH Con AS (
         SELECT Id FROM PhongBan WHERE PhongBanChaId = @id
         UNION ALL
         SELECT p.Id FROM PhongBan p JOIN Con c ON p.PhongBanChaId = c.Id
       )
       SELECT COUNT(*) AS cnt FROM Con WHERE Id = @x
       OPTION (MAXRECURSION 50)`
    );
  return r.recordset[0].cnt > 0;
}

async function layPhongBan(pool, id) {
  const r = await pool
    .request()
    .input('id', id)
    .query('SELECT Id, Ten, MaPhongBan, PhongBanChaId, ThuTu FROM PhongBan WHERE Id = @id AND DaXoa = 0');
  return r.recordset[0] ?? null;
}

/** Trùng tên trong cùng đơn vị cha? Trả về { message, truong } hoặc null. */
async function kiemTraTrungTen(pool, Ten, PhongBanChaId, boQuaId) {
  const r = await pool
    .request()
    .input('ten', sql.NVarChar(200), Ten)
    .input('cha', sql.Int, PhongBanChaId)
    .input('boQua', sql.Int, boQuaId ?? 0)
    .query(
      `SELECT TOP 1 Id FROM PhongBan
       WHERE DaXoa = 0 AND Ten = @ten AND Id <> @boQua
         AND ((PhongBanChaId IS NULL AND @cha IS NULL) OR PhongBanChaId = @cha)`
    );
  return r.recordset[0]
    ? { message: `Đã có phòng ban "${Ten}" trong cùng đơn vị cha`, truong: 'Ten' }
    : null;
}

/** Trùng mã phòng ban (mã là duy nhất toàn hệ thống)? */
async function kiemTraTrungMa(pool, MaPhongBan, boQuaId) {
  if (!MaPhongBan) return null;
  const r = await pool
    .request()
    .input('ma', sql.NVarChar(30), MaPhongBan)
    .input('boQua', sql.Int, boQuaId ?? 0)
    .query('SELECT TOP 1 Id FROM PhongBan WHERE DaXoa = 0 AND MaPhongBan = @ma AND Id <> @boQua');
  return r.recordset[0]
    ? { message: `Mã "${MaPhongBan}" đã được dùng cho phòng ban khác`, truong: 'MaPhongBan' }
    : null;
}

async function kiemTraTrung(pool, d, boQuaId) {
  return (await kiemTraTrungTen(pool, d.Ten, d.PhongBanChaId, boQuaId)) ?? (await kiemTraTrungMa(pool, d.MaPhongBan, boQuaId));
}

/** Lý do KHÔNG được xóa (hoặc null nếu xóa được). Dùng cho xóa 1 và xóa nhiều. */
async function kiemTraDuocXoa(pool, id) {
  const pb = await layPhongBan(pool, id);
  if (!pb) return { ten: null, lyDo: 'Không tồn tại hoặc đã bị xóa' };

  const r = await pool
    .request()
    .input('id', id)
    .query(
      `SELECT
         (SELECT COUNT(*) FROM PhongBan WHERE PhongBanChaId = @id AND DaXoa = 0) AS Con,
         (SELECT COUNT(*) FROM ChucVu WHERE PhongBanId = @id AND DaXoa = 0) AS ChucVu,
         (SELECT COUNT(*) FROM NhanVien WHERE PhongBanId = @id AND DangLamViec = 1 AND DaXoa = 0) AS NhanVien,
         (SELECT COUNT(*) FROM DinhBienViTri WHERE PhongBanId = @id) AS DinhBien`
    );
  const d = r.recordset[0];
  const chan = [];
  if (d.Con) chan.push(`${d.Con} phòng ban con`);
  if (d.ChucVu) chan.push(`${d.ChucVu} chức vụ`);
  if (d.NhanVien) chan.push(`${d.NhanVien} nhân viên đang làm việc`);
  if (d.DinhBien) chan.push(`${d.DinhBien} dòng định biên`);
  return { ten: pb.Ten, lyDo: chan.length ? `Còn ${chan.join(', ')}` : null };
}

// ---------------------------------------------------------------------------
// Cây phòng ban (đúng thứ tự cha trước con) — gọi stored procedure
// ---------------------------------------------------------------------------
router.get('/', ...docDuoc, async (req, res) => {
  const pool = await getPool();
  const r = await pool
    .request()
    .input('TuKhoa', sql.NVarChar(200), thoatTuKhoaLike(req.query.tim))
    .execute('sp_LayCayPhongBan');
  res.json(r.recordset);
});

// Kiểm tra trùng khi người dùng rời ô nhập: ?truong=Ten|MaPhongBan&giaTri=&phongBanChaId=&boQuaId=
router.get('/kiem-tra', ...ghiDuoc, async (req, res) => {
  const pool = await getPool();
  const { truong, giaTri } = req.query;
  const cha = req.query.phongBanChaId ? Number(req.query.phongBanChaId) : null;
  const boQuaId = req.query.boQuaId ? Number(req.query.boQuaId) : null;
  if (!giaTri || !['Ten', 'MaPhongBan'].includes(truong)) return res.json({ daTonTai: false });

  const trung =
    truong === 'Ten'
      ? await kiemTraTrungTen(pool, giaTri.toString().trim(), cha, boQuaId)
      : await kiemTraTrungMa(pool, giaTri.toString().trim(), boQuaId);
  res.json({ daTonTai: !!trung, message: trung?.message ?? null });
});

router.get('/:id', ...docDuoc, async (req, res) => {
  const pb = await layPhongBan(await getPool(), layId(req));
  if (!pb) throw loiNghiepVu(404, 'Không tìm thấy phòng ban');
  res.json(pb);
});

// ---------------------------------------------------------------------------
// Thêm
// ---------------------------------------------------------------------------
router.post('/', ...ghiDuoc, validate(PhongBanSchema), async (req, res) => {
  const d = req.body;
  const pool = await getPool();

  if (d.PhongBanChaId && !(await layPhongBan(pool, d.PhongBanChaId))) {
    return res.status(400).json({ message: 'Phòng ban cha không tồn tại hoặc đã bị xóa', truong: 'PhongBanChaId' });
  }
  const trung = await kiemTraTrung(pool, d, null);
  if (trung) return res.status(409).json(trung);

  const r = await pool
    .request()
    .input('ten', sql.NVarChar(200), d.Ten)
    .input('ma', sql.NVarChar(30), d.MaPhongBan)
    .input('cha', sql.Int, d.PhongBanChaId)
    .input('thuTu', sql.Int, d.ThuTu)
    .query(
      `INSERT INTO PhongBan (Ten, MaPhongBan, PhongBanChaId, ThuTu)
       OUTPUT INSERTED.Id, INSERTED.Ten, INSERTED.MaPhongBan, INSERTED.PhongBanChaId, INSERTED.ThuTu
       VALUES (@ten, @ma, @cha, @thuTu)`
    );
  res.status(201).json(r.recordset[0]);
});

// ---------------------------------------------------------------------------
// Sửa — chặn chọn chính nó / con cháu của nó làm cha (sẽ tạo vòng lặp)
// ---------------------------------------------------------------------------
router.put('/:id', ...ghiDuoc, validate(PhongBanSchema), async (req, res) => {
  const id = layId(req);
  const d = req.body;
  const pool = await getPool();

  const cu = await layPhongBan(pool, id);
  if (!cu) throw loiNghiepVu(404, 'Không tìm thấy phòng ban');

  if (d.PhongBanChaId) {
    if (d.PhongBanChaId === id) {
      return res.status(400).json({ message: 'Phòng ban không thể là cha của chính nó', truong: 'PhongBanChaId' });
    }
    if (!(await layPhongBan(pool, d.PhongBanChaId))) {
      return res.status(400).json({ message: 'Phòng ban cha không tồn tại hoặc đã bị xóa', truong: 'PhongBanChaId' });
    }
    if (await laConChauCua(pool, d.PhongBanChaId, id)) {
      return res.status(400).json({
        message: 'Không thể chọn phòng ban con/cháu làm phòng ban cha (tạo vòng lặp trong sơ đồ tổ chức)',
        truong: 'PhongBanChaId',
      });
    }
  }
  const trung = await kiemTraTrung(pool, d, id);
  if (trung) return res.status(409).json(trung);

  await pool
    .request()
    .input('id', sql.Int, id)
    .input('ten', sql.NVarChar(200), d.Ten)
    .input('ma', sql.NVarChar(30), d.MaPhongBan)
    .input('cha', sql.Int, d.PhongBanChaId)
    .input('thuTu', sql.Int, d.ThuTu)
    .query(`UPDATE PhongBan SET Ten = @ten, MaPhongBan = @ma, PhongBanChaId = @cha, ThuTu = @thuTu WHERE Id = @id`);

  await ghiNhatKyThayDoi('PhongBan', id, cu, d, req.user.id);
  res.json({ message: 'Đã cập nhật phòng ban', Id: id, ...d });
});

// ---------------------------------------------------------------------------
// Xóa mềm: xóa nhiều (POST /xoa-nhieu) và xóa 1 mục (DELETE /:id)
// ---------------------------------------------------------------------------
router.post('/xoa-nhieu', ...ghiDuoc, validate(XoaNhieuSchema), async (req, res) => {
  const pool = await getPool();
  const kq = await xoaNhieuTheoLuot(
    req.body.ids,
    (id) => kiemTraDuocXoa(pool, id),
    (id) => xoaMem(pool, 'PhongBan', id, req.user.id)
  );
  if (kq.daXoa.length === 0) {
    return res.status(409).json({ message: 'Không xóa được mục nào', ...kq });
  }
  res.json({ message: `Đã xóa ${kq.daXoa.length} phòng ban`, ...kq });
});

router.delete('/:id', ...ghiDuoc, async (req, res) => {
  const id = layId(req);
  const pool = await getPool();
  const kq = await kiemTraDuocXoa(pool, id);
  if (kq.ten === null) throw loiNghiepVu(404, 'Không tìm thấy phòng ban');
  if (kq.lyDo) {
    return res.status(409).json({ message: `Không thể xóa phòng ban "${kq.ten}": ${kq.lyDo}` });
  }
  await xoaMem(pool, 'PhongBan', id, req.user.id);
  res.json({ message: `Đã xóa phòng ban "${kq.ten}"` });
});

module.exports = router;
