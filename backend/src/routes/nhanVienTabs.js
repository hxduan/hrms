const express = require('express');
const { getPool, sql } = require('../db');
const { xacThuc, requireRole } = require('../middleware/auth');
const { yeuCauDaGanHoSo } = require('../middleware/quyen');
const { validate } = require('../middleware/validate');
const { NghiViecSchema, HuyNghiViecSchema, HopDongSchema, QuaTrinhSchema, PhuCapSchema, NguoiPhuThuocSchema, homNayYMD } = require('../validation/nhanSu');
const { ghiNhatKyThayDoi } = require('../services/nhatKy');
const { ghiNhatKyXoaCung } = require('../services/nhatKyXoa');
const { kiemTraConDinhBien } = require('../services/dinhBien');
const { timChongLan, moTaKhoang } = require('../services/hopDongChongLan');
const { dongBoNhanVien } = require('../services/lichDongBo');
const { loiNghiepVu } = require('../services/loi');
const { taoRouterTab, xacDinhNhanVien } = require('./nhanVienTab');

const D = (c) => `CONVERT(VARCHAR(10), ${c}, 23)`; // ngày -> 'YYYY-MM-DD' (không lệch múi giờ)

async function ton(pool, bang, id) {
  const r = await pool.request().input('id', id).query(`SELECT 1 AS x FROM ${bang} WHERE Id = @id AND DaXoa = 0`);
  return !!r.recordset[0];
}

// ---------------------------------------------------------------------------
// HỢP ĐỒNG
// ---------------------------------------------------------------------------
const hopDong = taoRouterTab({
  bang: 'HopDong',
  schema: HopDongSchema,
  cot: [
    { ten: 'LoaiHopDongId', kieu: sql.Int },
    { ten: 'SoHopDong', kieu: sql.NVarChar(50) },
    { ten: 'NgayBatDau', kieu: sql.Date },
    { ten: 'NgayKetThuc', kieu: sql.Date },
    { ten: 'LuongCoBan', kieu: sql.Decimal(18, 2) },
    { ten: 'LuongDongBHXH', kieu: sql.Decimal(18, 2) },
    { ten: 'GhiChu', kieu: sql.NVarChar(300) },
  ],
  chon: {
    cot: `t.Id, t.LoaiHopDongId, l.Ten AS TenLoaiHopDong, t.SoHopDong, ${D('t.NgayBatDau')} AS NgayBatDau,
          ${D('t.NgayKetThuc')} AS NgayKetThuc, t.LuongCoBan, t.LuongDongBHXH, t.GhiChu`,
    noi: 'JOIN LoaiHopDong l ON l.Id = t.LoaiHopDongId',
  },
  sapXep: 't.NgayBatDau DESC, t.Id DESC',
  async truocKhiLuu(pool, { nhanVienId, du, id }) {
    if (!(await ton(pool, 'LoaiHopDong', du.LoaiHopDongId))) {
      return { status: 400, message: 'Loại hợp đồng không tồn tại hoặc đã bị xóa', truong: 'LoaiHopDongId' };
    }
    if (du.SoHopDong) {
      const trung = await pool.request().input('so', du.SoHopDong).input('id', id ?? 0)
        .query('SELECT 1 AS x FROM HopDong WHERE SoHopDong = @so AND DaXoa = 0 AND Id <> @id');
      if (trung.recordset[0]) return { status: 409, message: `Số hợp đồng "${du.SoHopDong}" đã tồn tại`, truong: 'SoHopDong' };
    }
    const nv = await pool.request().input('id', nhanVienId).query(`SELECT ${D('NgayVaoLam')} AS NgayVaoLam FROM NhanVien WHERE Id = @id`);
    const ngayVaoLam = nv.recordset[0]?.NgayVaoLam;
    if (ngayVaoLam && du.NgayBatDau < ngayVaoLam) {
      return { status: 409, message: `Hợp đồng không được bắt đầu trước ngày vào làm (${ngayVaoLam})`, truong: 'NgayBatDau' };
    }
    const cac = await pool.request().input('nv', nhanVienId)
      .query(`SELECT Id, SoHopDong, ${D('NgayBatDau')} AS NgayBatDau, ${D('NgayKetThuc')} AS NgayKetThuc
              FROM HopDong WHERE NhanVienId = @nv AND DaXoa = 0`);
    const chong = timChongLan(cac.recordset, du, { boQuaId: id });
    if (chong.length) {
      return {
        status: 409,
        message: `Trùng thời gian với hợp đồng ${chong[0].SoHopDong ?? '#' + chong[0].Id} (${moTaKhoang(chong[0])})`,
        truong: 'NgayBatDau',
      };
    }
    return null;
  },
});

// ---------------------------------------------------------------------------
// QUÁ TRÌNH CÔNG TÁC (bổ nhiệm, điều chuyển...) — mỗi bản ghi có NGÀY HIỆU LỰC
// ---------------------------------------------------------------------------
const quaTrinh = taoRouterTab({
  bang: 'QuaTrinhLamViec',
  schema: QuaTrinhSchema,
  cot: [
    { ten: 'LoaiBienDong', kieu: sql.NVarChar(15) },
    { ten: 'NgayHieuLuc', kieu: sql.Date },
    { ten: 'PhongBanId', kieu: sql.Int },
    { ten: 'ChucVuId', kieu: sql.Int },
    { ten: 'ChucDanhId', kieu: sql.Int },
    { ten: 'SoQuyetDinh', kieu: sql.NVarChar(50) },
    { ten: 'GhiChu', kieu: sql.NVarChar(300) },
  ],
  chon: {
    cot: `t.Id, t.LoaiBienDong, ${D('t.NgayHieuLuc')} AS NgayHieuLuc, t.PhongBanId, pb.Ten AS TenPhongBan,
          t.ChucVuId, cv.Ten AS TenChucVu, t.ChucDanhId, cd.Ten AS TenChucDanh, t.SoQuyetDinh, t.GhiChu`,
    noi: `LEFT JOIN PhongBan pb ON pb.Id = t.PhongBanId
          LEFT JOIN ChucVu cv ON cv.Id = t.ChucVuId
          LEFT JOIN ChucDanh cd ON cd.Id = t.ChucDanhId`,
  },
  sapXep: 't.NgayHieuLuc DESC, t.Id DESC',
  async truocKhiLuu(pool, { nhanVienId, du, nguoi }) {
    const nv = await pool.request().input('id', nhanVienId).query('SELECT DangLamViec FROM NhanVien WHERE Id = @id');
    if (!nv.recordset[0].DangLamViec) return { status: 409, message: 'Nhân viên đã nghỉ việc, không thể thêm biến động công tác' };
    if (!(await ton(pool, 'PhongBan', du.PhongBanId))) return { status: 400, message: 'Phòng ban không tồn tại hoặc đã bị xóa', truong: 'PhongBanId' };
    if (!(await ton(pool, 'ChucDanh', du.ChucDanhId))) return { status: 400, message: 'Chức danh không tồn tại hoặc đã bị xóa', truong: 'ChucDanhId' };
    if (du.ChucVuId && !(await ton(pool, 'ChucVu', du.ChucVuId))) return { status: 400, message: 'Chức vụ không tồn tại hoặc đã bị xóa', truong: 'ChucVuId' };

    // Chỉ kiểm tra định biên khi thay đổi có hiệu lực từ hôm nay trở về trước (người đó sẽ chiếm chỗ ngay)
    if (du.NgayHieuLuc <= homNayYMD()) {
      const dg = await kiemTraConDinhBien(pool, du.PhongBanId, du.ChucDanhId, { boQuaNhanVienId: nhanVienId });
      if (!dg.duocPhep) {
        if (!du.xacNhanVuotDinhBien) return { status: 409, body: { message: dg.canhBao, maLoi: 'VUOT_DINH_BIEN' } };
        await ghiNhatKyThayDoi('NhanVien', nhanVienId, { '(vuot_dinh_bien)': '' }, { '(vuot_dinh_bien)': du.lyDoVuotDinhBien }, nguoi.id);
      }
    }
    return null;
  },
  sauKhiLuu: (pool, { nhanVienId }) => dongBoNhanVien(nhanVienId),
  sauKhiXoa: (pool, { nhanVienId }) => dongBoNhanVien(nhanVienId),
});

// ---------------------------------------------------------------------------
// PHỤ CẤP (đầu vào của tính lương)
// ---------------------------------------------------------------------------
const phuCap = taoRouterTab({
  bang: 'PhuCapNhanVien',
  schema: PhuCapSchema,
  cot: [
    { ten: 'TenPhuCap', kieu: sql.NVarChar(200) },
    { ten: 'SoTien', kieu: sql.Decimal(18, 2) },
    { ten: 'TinhBHXH', kieu: sql.Bit },
    { ten: 'TinhThue', kieu: sql.Bit },
    { ten: 'MienThueToiDa', kieu: sql.Decimal(18, 2) },
    { ten: 'NgayHieuLuc', kieu: sql.Date },
    { ten: 'NgayKetThuc', kieu: sql.Date },
  ],
  chon: {
    cot: `t.Id, t.TenPhuCap, t.SoTien, t.TinhBHXH, t.TinhThue, t.MienThueToiDa,
          ${D('t.NgayHieuLuc')} AS NgayHieuLuc, ${D('t.NgayKetThuc')} AS NgayKetThuc`,
  },
  sapXep: 't.NgayHieuLuc DESC, t.Id DESC',
  async truocKhiLuu(pool, { nhanVienId, du, id }) {
    // Cùng một khoản phụ cấp không được chạy chồng thời gian (sẽ bị tính hai lần)
    const cac = await pool.request().input('nv', nhanVienId).input('ten', du.TenPhuCap)
      .query(`SELECT Id, ${D('NgayHieuLuc')} AS NgayHieuLuc, ${D('NgayKetThuc')} AS NgayKetThuc
              FROM PhuCapNhanVien WHERE NhanVienId = @nv AND DaXoa = 0 AND TenPhuCap = @ten`);
    const chong = timChongLan(cac.recordset, { NgayHieuLuc: du.NgayHieuLuc, NgayKetThuc: du.NgayKetThuc }, { boQuaId: id, batDau: 'NgayHieuLuc' });
    if (chong.length) {
      return { status: 409, message: `Phụ cấp "${du.TenPhuCap}" đã có trong khoảng ${moTaKhoang(chong[0], 'NgayHieuLuc')}`, truong: 'NgayHieuLuc' };
    }
    return null;
  },
});

// ---------------------------------------------------------------------------
// NGƯỜI PHỤ THUỘC (giảm trừ gia cảnh)
// ---------------------------------------------------------------------------
const nguoiPhuThuoc = taoRouterTab({
  bang: 'NguoiPhuThuocNhanVien',
  schema: NguoiPhuThuocSchema,
  cot: [
    { ten: 'HoTen', kieu: sql.NVarChar(200) },
    { ten: 'QuanHe', kieu: sql.NVarChar(50) },
    { ten: 'NgaySinh', kieu: sql.Date },
    { ten: 'MaSoThue', kieu: sql.NVarChar(15) },
    { ten: 'SoCCCD', kieu: sql.NVarChar(20) },
    { ten: 'NgayBatDauTinhGiamTru', kieu: sql.Date },
    { ten: 'NgayKetThucTinhGiamTru', kieu: sql.Date },
  ],
  chon: {
    cot: `t.Id, t.HoTen, t.QuanHe, ${D('t.NgaySinh')} AS NgaySinh, t.MaSoThue, t.SoCCCD,
          ${D('t.NgayBatDauTinhGiamTru')} AS NgayBatDauTinhGiamTru, ${D('t.NgayKetThucTinhGiamTru')} AS NgayKetThucTinhGiamTru`,
  },
  sapXep: 't.NgayBatDauTinhGiamTru DESC, t.Id DESC',
});

// ---------------------------------------------------------------------------
// NGHỈ VIỆC (mỗi nhân viên tối đa 1 quyết định)
// ---------------------------------------------------------------------------
const nghiViec = express.Router({ mergeParams: true });

const SELECT_NGHI_VIEC = `SELECT n.Id, n.LyDoNghiViecId, l.Ten AS TenLyDo, ${D('n.NgayNghiViec')} AS NgayNghiViec,
       ${D('n.NgayLamViecCuoi')} AS NgayLamViecCuoi, n.GhiChu, n.KhoaTaiKhoan
  FROM NghiViec n LEFT JOIN LyDoNghiViec l ON l.Id = n.LyDoNghiViecId WHERE n.NhanVienId = @nv`;

nghiViec.get('/', xacThuc, yeuCauDaGanHoSo, async (req, res) => {
  const pool = await getPool();
  const nv = await xacDinhNhanVien(req, pool, { chiDoc: true });
  const r = await pool.request().input('nv', nv).query(SELECT_NGHI_VIEC);
  res.json(r.recordset[0] ?? null);
});

nghiViec.post('/', xacThuc, requireRole('admin', 'hr'), validate(NghiViecSchema), async (req, res) => {
  const pool = await getPool();
  const nhanVienId = await xacDinhNhanVien(req, pool, { chiDoc: false });
  const du = req.body;

  const nv = await pool.request().input('id', nhanVienId)
    .query(`SELECT DangLamViec, ${D('NgayVaoLam')} AS NgayVaoLam, (SELECT COUNT(*) FROM NghiViec WHERE NhanVienId = @id) AS DaCoQuyetDinh FROM NhanVien WHERE Id = @id`);
  const hoSo = nv.recordset[0];
  if (hoSo.DaCoQuyetDinh) return res.status(409).json({ message: 'Nhân viên này đã có quyết định nghỉ việc' });
  if (!hoSo.DangLamViec) return res.status(409).json({ message: 'Nhân viên đã nghỉ việc' });
  if (hoSo.NgayVaoLam && du.NgayNghiViec < hoSo.NgayVaoLam) {
    return res.status(409).json({ message: `Ngày nghỉ việc không được trước ngày vào làm (${hoSo.NgayVaoLam})`, truong: 'NgayNghiViec' });
  }
  if (!(await ton(pool, 'LyDoNghiViec', du.LyDoNghiViecId))) {
    return res.status(400).json({ message: 'Lý do nghỉ việc không tồn tại', truong: 'LyDoNghiViecId' });
  }

  await pool.request()
    .input('nv', sql.Int, nhanVienId).input('ly', sql.Int, du.LyDoNghiViecId)
    .input('ngay', sql.Date, du.NgayNghiViec).input('cuoi', sql.Date, du.NgayLamViecCuoi)
    .input('ghiChu', sql.NVarChar(300), du.GhiChu).input('khoa', sql.Bit, du.KhoaTaiKhoan)
    .query(`INSERT INTO NghiViec (NhanVienId, LyDoNghiViecId, NgayNghiViec, NgayLamViecCuoi, GhiChu, KhoaTaiKhoan)
            VALUES (@nv, @ly, @ngay, @cuoi, @ghiChu, @khoa)`);
  await ghiNhatKyThayDoi('NhanVien', nhanVienId, { QuyetDinhNghiViec: '' }, { QuyetDinhNghiViec: `Nghỉ việc từ ${du.NgayNghiViec}` }, req.user.id);
  await dongBoNhanVien(nhanVienId); // tới hạn thì đặt DangLamViec = 0 và khóa tài khoản ngay
  const sau = await pool.request().input('nv', nhanVienId).query(SELECT_NGHI_VIEC);
  res.status(201).json({ ...sau.recordset[0], coHieuLucNgay: du.NgayNghiViec <= homNayYMD() });
});

// Hủy quyết định nghỉ việc (ghi nhầm / nhân viên quay lại) — chỉ admin, bắt buộc lý do
nghiViec.delete('/', xacThuc, requireRole('admin'), validate(HuyNghiViecSchema), async (req, res) => {
  const pool = await getPool();
  const nhanVienId = await xacDinhNhanVien(req, pool, { chiDoc: false });
  const r = await pool.request().input('nv', nhanVienId).query(SELECT_NGHI_VIEC);
  const cu = r.recordset[0];
  if (!cu) throw loiNghiepVu(404, 'Nhân viên chưa có quyết định nghỉ việc');

  await ghiNhatKyXoaCung('NghiViec', cu.Id, { ...cu, lyDoHuy: req.body.lyDo }, req.user.id);
  await pool.request().input('id', sql.Int, cu.Id).query('DELETE FROM NghiViec WHERE Id = @id');
  await pool.request().input('nv', sql.Int, nhanVienId).query('UPDATE NhanVien SET DangLamViec = 1 WHERE Id = @nv');
  await ghiNhatKyThayDoi('NhanVien', nhanVienId, { DangLamViec: 0 }, { DangLamViec: 1 }, req.user.id);
  res.json({ message: 'Đã hủy quyết định nghỉ việc. Tài khoản (nếu đã bị khóa) cần được mở khóa thủ công ở Quản trị → Tài khoản.' });
});

module.exports = { hopDong, quaTrinh, phuCap, nguoiPhuThuoc, nghiViec };
