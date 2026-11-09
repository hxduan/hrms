const express = require('express');
const { getPool, sql } = require('../db');
const { xacThuc, requireRole } = require('../middleware/auth');
const { yeuCauDaGanHoSo } = require('../middleware/quyen');
const { validate } = require('../middleware/validate');
const { NhanVienSchema, NhanVienSuaSchema } = require('../validation/nhanSu');
const { XoaNhieuSchema } = require('../validation/chung');
const { ghiNhatKyThayDoi } = require('../services/nhatKy');
const { kiemTraConDinhBien } = require('../services/dinhBien');
const { xoaMem } = require('../services/xoaMem');
const { xoaNhieuTheoLuot } = require('../services/xoaNhieu');
const { docPhanTrang, docSapXep } = require('../services/phanTrang');
const { dongBoNhanVien } = require('../services/lichDongBo');
const { loiNghiepVu, layId, thoatTuKhoaLike } = require('../services/loi');
const tabs = require('./nhanVienTabs');

const router = express.Router();
const doc = [xacThuc, yeuCauDaGanHoSo];
const ghi = [xacThuc, requireRole('admin', 'hr')];

// ---------------------------------------------------------------------------
// Tiện ích
// ---------------------------------------------------------------------------
async function layChiTiet(pool, id) {
  const r = await pool.request().input('NhanVienId', sql.Int, id).execute('sp_LayThongTinTongQuanNhanVien');
  return r.recordset[0] ?? null;
}

async function ton(pool, bang, id) {
  const r = await pool.request().input('id', id).query(`SELECT 1 AS x FROM ${bang} WHERE Id = @id AND DaXoa = 0`);
  return !!r.recordset[0];
}

const TRUONG_TRUNG = {
  CCCD: { cot: 'SoCCCD', nhan: 'Số CCCD' },
  Email: { cot: 'Email', nhan: 'Email' },
  SoSoBHXH: { cot: 'SoSoBHXH', nhan: 'Số sổ BHXH' },
  MaSoThue: { cot: 'MaSoThue', nhan: 'Mã số thuế' },
};

/** Trả về { truong, message } của giá trị trùng đầu tiên (so với nhân viên chưa xóa), hoặc null. */
async function timTrung(pool, du, boQuaId) {
  const cacTruong = { SoCCCD: TRUONG_TRUNG.CCCD, Email: TRUONG_TRUNG.Email, SoSoBHXH: TRUONG_TRUNG.SoSoBHXH, MaSoThue: TRUONG_TRUNG.MaSoThue };
  for (const [truong, { cot, nhan }] of Object.entries(cacTruong)) {
    if (!du[truong]) continue;
    const r = await pool.request().input('v', du[truong]).input('boQua', boQuaId ?? 0)
      .query(`SELECT MaNhanVien, HoTen FROM NhanVien WHERE ${cot} = @v AND DaXoa = 0 AND Id <> @boQua`);
    if (r.recordset[0]) {
      return { truong, message: `${nhan} đã được dùng cho nhân viên ${r.recordset[0].MaNhanVien} — ${r.recordset[0].HoTen}` };
    }
  }
  return null;
}

/** Lý do KHÔNG được xóa nhân viên (nhân viên đã phát sinh dữ liệu thì chỉ được cho nghỉ việc, không xóa). */
async function kiemTraDuocXoa(pool, id) {
  const nv = await pool.request().input('id', id).query('SELECT HoTen, MaNhanVien FROM NhanVien WHERE Id = @id AND DaXoa = 0');
  if (!nv.recordset[0]) return { ten: null, lyDo: 'Không tồn tại hoặc đã bị xóa' };
  const r = await pool.request().input('id', id).query(
    `SELECT (SELECT COUNT(*) FROM HopDong WHERE NhanVienId = @id AND DaXoa = 0) AS HopDong,
            (SELECT COUNT(*) FROM TaiKhoan WHERE NhanVienId = @id) AS TaiKhoan,
            (SELECT COUNT(*) FROM ChamCongTho WHERE NhanVienId = @id) AS ChamCong,
            (SELECT COUNT(*) FROM BangCongTongHop WHERE NhanVienId = @id) AS BangCong,
            (SELECT COUNT(*) FROM DienBienLuong WHERE NhanVienId = @id) AS Luong,
            (SELECT COUNT(*) FROM DonNghiPhep WHERE NhanVienId = @id)
              + (SELECT COUNT(*) FROM DonLamThemGio WHERE NhanVienId = @id)
              + (SELECT COUNT(*) FROM DonCongTac WHERE NhanVienId = @id) AS DonTu`
  );
  const d = r.recordset[0];
  const chan = [];
  if (d.HopDong) chan.push(`${d.HopDong} hợp đồng`);
  if (d.TaiKhoan) chan.push('tài khoản đang liên kết (hãy gỡ liên kết ở Quản trị → Tài khoản)');
  if (d.ChamCong || d.BangCong) chan.push('dữ liệu chấm công');
  if (d.Luong) chan.push(`${d.Luong} bảng lương`);
  if (d.DonTu) chan.push(`${d.DonTu} đơn từ`);
  return {
    ten: `${nv.recordset[0].MaNhanVien} — ${nv.recordset[0].HoTen}`,
    lyDo: chan.length ? `Đã phát sinh ${chan.join(', ')}. Hãy dùng chức năng Nghỉ việc thay vì xóa` : null,
  };
}

const COT_INSERT = [
  ['HoTen', sql.NVarChar(200)], ['GioiTinh', sql.NVarChar(10)], ['NgaySinh', sql.Date], ['SoCCCD', sql.NVarChar(20)],
  ['SoDienThoai', sql.NVarChar(20)], ['Email', sql.NVarChar(255)], ['Tinh', sql.NVarChar(100)], ['MaTinh', sql.NVarChar(10)],
  ['PhuongXa', sql.NVarChar(100)], ['MaPhuongXa', sql.NVarChar(10)], ['DiaChiChiTiet', sql.NVarChar(300)],
  ['NgayVaoLam', sql.Date], ['SoSoBHXH', sql.NVarChar(15)], ['MaSoThue', sql.NVarChar(15)], ['VungLuong', sql.TinyInt],
  ['TenNganHang', sql.NVarChar(200)], ['SoTaiKhoanNganHang', sql.NVarChar(50)],
];

// ---------------------------------------------------------------------------
// Danh sách: phân trang / lọc / sắp xếp PHÍA MÁY CHỦ
// ---------------------------------------------------------------------------
router.get('/', ...ghi, async (req, res) => {
  const { trang, soDong } = docPhanTrang(req.query);
  const { cot, huong } = docSapXep(req.query, ['MaNhanVien', 'HoTen', 'NgayVaoLam', 'TenPhongBan', 'TenChucDanh'], 'MaNhanVien');
  const so = (v) => (v !== undefined && v !== '' && Number.isInteger(Number(v)) && Number(v) > 0 ? Number(v) : null);
  const trangThai = ['dang_lam', 'da_nghi'].includes(req.query.trangThai) ? req.query.trangThai : null;

  const pool = await getPool();
  const r = await pool.request()
    .input('Tim', sql.NVarChar(200), thoatTuKhoaLike(req.query.tim))
    .input('PhongBanId', sql.Int, so(req.query.phongBanId))
    .input('ChucDanhId', sql.Int, so(req.query.chucDanhId))
    .input('TrangThai', sql.VarChar(10), trangThai)
    .input('SapXep', sql.VarChar(30), cot)
    .input('Huong', sql.VarChar(4), huong)
    .input('Trang', sql.Int, trang)
    .input('SoDong', sql.Int, soDong)
    .execute('sp_DanhSachNhanVien');
  const tongSo = r.recordset[0]?.TongSo ?? 0;
  res.json({ dong: r.recordset.map(({ TongSo, ...d }) => d), tongSo, trang, soDong });
});

// Hồ sơ của chính mình (nhân viên, và cả admin/HR nếu tài khoản có gắn hồ sơ)
router.get('/toi', ...doc, async (req, res) => {
  const pool = await getPool();
  let id = req.user.employeeId;
  if (!id) {
    const r = await pool.request().input('t', req.user.id).query('SELECT NhanVienId FROM TaiKhoan WHERE Id = @t');
    id = r.recordset[0]?.NhanVienId;
  }
  if (!id) throw loiNghiepVu(404, 'Tài khoản chưa được gắn hồ sơ nhân viên');
  const hoSo = await layChiTiet(pool, id);
  if (!hoSo) throw loiNghiepVu(404, 'Không tìm thấy hồ sơ');
  res.json(hoSo);
});

// Kiểm tra trùng khi người dùng rời ô nhập: ?truong=CCCD|Email|SoSoBHXH|MaSoThue&giaTri=&boQuaId=
router.get('/kiem-tra', ...ghi, async (req, res) => {
  const t = TRUONG_TRUNG[req.query.truong];
  const giaTri = (req.query.giaTri ?? '').toString().trim();
  if (!t || !giaTri) return res.json({ daTonTai: false });
  const pool = await getPool();
  const r = await pool.request().input('v', giaTri).input('boQua', Number(req.query.boQuaId) || 0)
    .query(`SELECT MaNhanVien, HoTen FROM NhanVien WHERE ${t.cot} = @v AND DaXoa = 0 AND Id <> @boQua`);
  const d = r.recordset[0];
  res.json({ daTonTai: !!d, message: d ? `${t.nhan} đã được dùng cho nhân viên ${d.MaNhanVien} — ${d.HoTen}` : null });
});

router.post('/kiem-tra-dinh-bien', ...ghi, async (req, res) => {
  const pb = Number(req.body?.phongBanId);
  const cd = Number(req.body?.chucDanhId);
  if (!Number.isInteger(pb) || !Number.isInteger(cd) || pb <= 0 || cd <= 0) throw loiNghiepVu(400, 'Thiếu phòng ban hoặc chức danh');
  res.json(await kiemTraConDinhBien(await getPool(), pb, cd, { boQuaNhanVienId: Number(req.body?.boQuaNhanVienId) || 0 }));
});

// Chạy đồng bộ thủ công (điều chuyển/nghỉ việc đã tới ngày hiệu lực) — thường đã có bộ hẹn giờ lo
router.post('/dong-bo', xacThuc, requireRole('admin'), async (req, res) => {
  await dongBoNhanVien();
  res.json({ message: 'Đã đồng bộ vị trí công tác và trạng thái nghỉ việc' });
});

router.post('/xoa-nhieu', ...ghi, validate(XoaNhieuSchema), async (req, res) => {
  const pool = await getPool();
  const kq = await xoaNhieuTheoLuot(req.body.ids, (id) => kiemTraDuocXoa(pool, id), (id) => xoaMem(pool, 'NhanVien', id, req.user.id));
  if (kq.daXoa.length === 0) return res.status(409).json({ message: 'Không xóa được mục nào', ...kq });
  res.json({ message: `Đã xóa ${kq.daXoa.length} nhân viên`, ...kq });
});

// Các tab của hồ sơ — đăng ký TRƯỚC '/:id'
router.use('/:nhanVienId/hop-dong', tabs.hopDong);
router.use('/:nhanVienId/qua-trinh', tabs.quaTrinh);
router.use('/:nhanVienId/phu-cap', tabs.phuCap);
router.use('/:nhanVienId/nguoi-phu-thuoc', tabs.nguoiPhuThuoc);
router.use('/:nhanVienId/nghi-viec', tabs.nghiViec);

// ---------------------------------------------------------------------------
// Chi tiết / thêm / sửa / xóa
// ---------------------------------------------------------------------------
router.get('/:id', ...ghi, async (req, res) => {
  const hoSo = await layChiTiet(await getPool(), layId(req));
  if (!hoSo) throw loiNghiepVu(404, 'Không tìm thấy nhân viên');
  res.json(hoSo);
});

router.post('/', ...ghi, validate(NhanVienSchema), async (req, res) => {
  const d = req.body;
  const pool = await getPool();

  const trung = await timTrung(pool, d, null);
  if (trung) return res.status(409).json(trung);
  if (!(await ton(pool, 'PhongBan', d.PhongBanId))) return res.status(400).json({ message: 'Phòng ban không tồn tại hoặc đã bị xóa', truong: 'PhongBanId' });
  if (!(await ton(pool, 'ChucDanh', d.ChucDanhId))) return res.status(400).json({ message: 'Chức danh không tồn tại hoặc đã bị xóa', truong: 'ChucDanhId' });
  if (d.ChucVuId && !(await ton(pool, 'ChucVu', d.ChucVuId))) return res.status(400).json({ message: 'Chức vụ không tồn tại hoặc đã bị xóa', truong: 'ChucVuId' });

  const dg = await kiemTraConDinhBien(pool, d.PhongBanId, d.ChucDanhId);
  if (!dg.duocPhep && !d.xacNhanVuotDinhBien) {
    return res.status(409).json({ message: dg.canhBao, maLoi: 'VUOT_DINH_BIEN', soDuyet: dg.soDuyet, dangGiu: dg.dangGiu });
  }

  const n = (await pool.request().query('SELECT NEXT VALUE FOR SeqMaNhanVien AS n')).recordset[0].n;
  const maNhanVien = `NV${String(n).padStart(4, '0')}`; // SEQUENCE: hai người tạo cùng lúc không bao giờ trùng mã

  const tx = new sql.Transaction(pool);
  await tx.begin();
  let id;
  try {
    const rq = new sql.Request(tx).input('ma', sql.NVarChar(20), maNhanVien)
      .input('pb', sql.Int, d.PhongBanId).input('cv', sql.Int, d.ChucVuId).input('cd', sql.Int, d.ChucDanhId);
    COT_INSERT.forEach(([ten, kieu]) => rq.input(ten, kieu, d[ten]));
    const r = await rq.query(
      `INSERT INTO NhanVien (MaNhanVien, PhongBanId, ChucVuId, ChucDanhId, ${COT_INSERT.map(([t]) => t).join(', ')})
       OUTPUT INSERTED.Id
       VALUES (@ma, @pb, @cv, @cd, ${COT_INSERT.map(([t]) => '@' + t).join(', ')})`
    );
    id = r.recordset[0].Id;
    // Bản ghi đầu tiên của "Quá trình công tác" = vị trí lúc tiếp nhận (lịch sử luôn đầy đủ từ ngày đầu)
    await new sql.Request(tx).input('nv', sql.Int, id).input('ngay', sql.Date, d.NgayVaoLam)
      .input('pb', sql.Int, d.PhongBanId).input('cv', sql.Int, d.ChucVuId).input('cd', sql.Int, d.ChucDanhId)
      .query(`INSERT INTO QuaTrinhLamViec (NhanVienId, PhongBanId, ChucVuId, ChucDanhId, NgayHieuLuc, LoaiBienDong, GhiChu)
              VALUES (@nv, @pb, @cv, @cd, @ngay, 'khac', N'Tiếp nhận')`);
    await tx.commit();
  } catch (err) {
    await tx.rollback();
    throw err;
  }

  if (!dg.duocPhep) {
    await ghiNhatKyThayDoi('NhanVien', id, { '(vuot_dinh_bien)': '' }, { '(vuot_dinh_bien)': d.lyDoVuotDinhBien }, req.user.id);
  }
  res.status(201).json(await layChiTiet(pool, id));
});

// Sửa thông tin cá nhân. KHÔNG đổi phòng ban/chức vụ/chức danh ở đây — dùng tab "Quá trình công tác".
router.put('/:id', ...ghi, validate(NhanVienSuaSchema), async (req, res) => {
  const id = layId(req);
  const d = req.body;
  const pool = await getPool();
  const cu = await layChiTiet(pool, id);
  if (!cu) throw loiNghiepVu(404, 'Không tìm thấy nhân viên');

  const trung = await timTrung(pool, d, id);
  if (trung) return res.status(409).json(trung);

  const rq = pool.request().input('id', sql.Int, id);
  COT_INSERT.forEach(([ten, kieu]) => rq.input(ten, kieu, d[ten]));
  await rq.query(`UPDATE NhanVien SET ${COT_INSERT.map(([t]) => `${t} = @${t}`).join(', ')} WHERE Id = @id`);

  const moi = Object.fromEntries(COT_INSERT.map(([t]) => [t, d[t]]));
  await ghiNhatKyThayDoi('NhanVien', id, cu, moi, req.user.id);
  res.json(await layChiTiet(pool, id));
});

router.delete('/:id', ...ghi, async (req, res) => {
  const id = layId(req);
  const pool = await getPool();
  const kq = await kiemTraDuocXoa(pool, id);
  if (kq.ten === null) throw loiNghiepVu(404, 'Không tìm thấy nhân viên');
  if (kq.lyDo) return res.status(409).json({ message: `Không thể xóa ${kq.ten}: ${kq.lyDo}` });
  await xoaMem(pool, 'NhanVien', id, req.user.id);
  res.json({ message: `Đã xóa nhân viên ${kq.ten}` });
});

module.exports = router;
