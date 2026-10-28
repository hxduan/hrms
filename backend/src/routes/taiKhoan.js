const express = require('express');
const bcrypt = require('bcrypt');

const { getPool, sql } = require('../db');
const { xacThuc, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { ghiNhatKyThayDoi } = require('../services/nhatKy');
const { layId, thoatTuKhoaLike } = require('../services/loi');
const {
  TaoTaiKhoanSchema,
  DoiVaiTroSchema,
  GanNhanVienSchema,
  AdminDatLaiMatKhauSchema,
} = require('../validation/taiKhoan');

const router = express.Router();
const quanTri = [xacThuc, requireRole('admin', 'hr')];

async function layTaiKhoan(pool, id) {
  const r = await pool
    .request()
    .input('id', id)
    .query('SELECT Id, TenDangNhap, Email, VaiTro, NhaCungCapOAuth, NhanVienId FROM TaiKhoan WHERE Id = @id');
  return r.recordset[0] ?? null;
}

/** HR chỉ được thao tác trên tài khoản `nhan_vien`; admin thao tác được mọi tài khoản. */
function hrKhongDuocDongVaoQuanTri(nguoiThaoTac, taiKhoanDich) {
  return nguoiThaoTac.role === 'hr' && taiKhoanDich.VaiTro !== 'nhan_vien';
}

// ---- Danh sách tài khoản --------------------------------------------------
router.get('/', ...quanTri, async (req, res) => {
  const pool = await getPool();
  const tim = thoatTuKhoaLike(req.query.tim);
  const chiChuaGan = req.query.chuaGanNhanVien === 'true';

  const r = await pool
    .request()
    .input('tim', sql.NVarChar(200), tim)
    .query(
      `SELECT TOP 500
              tk.Id, tk.TenDangNhap, tk.Email, tk.VaiTro, tk.NhaCungCapOAuth, tk.NhanVienId, tk.NgayTao,
              CASE WHEN tk.MatKhauMaHoa IS NOT NULL THEN 1 ELSE 0 END AS CoMatKhau,
              nv.MaNhanVien, nv.HoTen
       FROM TaiKhoan tk
       LEFT JOIN NhanVien nv ON nv.Id = tk.NhanVienId
       WHERE (@tim IS NULL OR tk.TenDangNhap LIKE N'%' + @tim + N'%'
                           OR tk.Email LIKE N'%' + @tim + N'%'
                           OR nv.HoTen LIKE N'%' + @tim + N'%')
         ${chiChuaGan ? 'AND tk.NhanVienId IS NULL' : ''}
       ORDER BY tk.NgayTao DESC, tk.Id DESC`
    );
  res.json(r.recordset);
});

// ---- Nhân viên có thể gắn (đang làm việc, chưa có tài khoản nào) -----------
router.get('/nhan-vien-co-the-gan', ...quanTri, async (req, res) => {
  const pool = await getPool();
  const r = await pool
    .request()
    .query(
      `SELECT TOP 500 nv.Id, nv.MaNhanVien, nv.HoTen
       FROM NhanVien nv
       WHERE nv.DaXoa = 0 AND nv.DangLamViec = 1
         AND NOT EXISTS (SELECT 1 FROM TaiKhoan tk WHERE tk.NhanVienId = nv.Id)
       ORDER BY nv.HoTen`
    );
  res.json(r.recordset);
});

// ---- Admin / HR tạo tài khoản cho nhân viên --------------------------------
router.post('/', ...quanTri, validate(TaoTaiKhoanSchema), async (req, res) => {
  const { tenDangNhap, email, matKhau, vaiTro, nhanVienId } = req.body;
  if (req.user.role === 'hr' && vaiTro !== 'nhan_vien') {
    return res.status(403).json({ message: 'Chỉ quản trị viên mới được tạo tài khoản admin hoặc HR' });
  }
  const pool = await getPool();

  const trung = await pool
    .request()
    .input('u', tenDangNhap)
    .input('e', email)
    .query('SELECT TenDangNhap, Email FROM TaiKhoan WHERE TenDangNhap = @u OR Email = @e');
  if (trung.recordset.some((d) => d.TenDangNhap?.toLowerCase() === tenDangNhap.toLowerCase())) {
    return res.status(409).json({ message: 'Tên đăng nhập đã tồn tại', truong: 'tenDangNhap' });
  }
  if (trung.recordset.length > 0) {
    return res.status(409).json({ message: 'Email đã được sử dụng', truong: 'email' });
  }

  if (nhanVienId) {
    const loi = await kiemTraCoTheGan(pool, nhanVienId, null);
    if (loi) return res.status(loi.status).json({ message: loi.message, truong: 'nhanVienId' });
  }

  const hash = await bcrypt.hash(matKhau, 10);
  const r = await pool
    .request()
    .input('u', tenDangNhap)
    .input('e', email)
    .input('p', hash)
    .input('vt', vaiTro)
    .input('nv', sql.Int, nhanVienId)
    .query(
      `INSERT INTO TaiKhoan (TenDangNhap, Email, MatKhauMaHoa, VaiTro, NhanVienId)
       OUTPUT INSERTED.Id, INSERTED.TenDangNhap, INSERTED.Email, INSERTED.VaiTro, INSERTED.NhanVienId
       VALUES (@u, @e, @p, @vt, @nv)`
    );
  res.status(201).json(r.recordset[0]);
});

/** Kiểm tra hồ sơ nhân viên có thể gắn cho tài khoản `boQuaTaiKhoanId` không. */
async function kiemTraCoTheGan(pool, nhanVienId, boQuaTaiKhoanId) {
  const nv = await pool
    .request()
    .input('id', nhanVienId)
    .query('SELECT Id, DaXoa, DangLamViec FROM NhanVien WHERE Id = @id');
  if (!nv.recordset[0] || nv.recordset[0].DaXoa) {
    return { status: 400, message: 'Hồ sơ nhân viên không tồn tại hoặc đã bị xóa' };
  }
  const dangGan = await pool
    .request()
    .input('id', nhanVienId)
    .input('boQua', boQuaTaiKhoanId ?? 0)
    .query('SELECT TenDangNhap FROM TaiKhoan WHERE NhanVienId = @id AND Id <> @boQua');
  if (dangGan.recordset[0]) {
    return {
      status: 409,
      message: `Hồ sơ này đã được gắn cho tài khoản "${dangGan.recordset[0].TenDangNhap ?? 'Google'}"`,
    };
  }
  return null;
}

// ---- Đổi vai trò (CHỈ admin) ------------------------------------------------
router.put('/:id/vai-tro', xacThuc, requireRole('admin'), validate(DoiVaiTroSchema), async (req, res) => {
  const id = layId(req);
  const pool = await getPool();
  const dich = await layTaiKhoan(pool, id);
  if (!dich) return res.status(404).json({ message: 'Không tìm thấy tài khoản' });

  if (dich.Id === req.user.id) {
    return res.status(400).json({ message: 'Không thể tự đổi vai trò của chính mình' });
  }
  if (dich.VaiTro === req.body.vaiTro) {
    return res.json({ message: 'Vai trò không thay đổi', VaiTro: dich.VaiTro });
  }
  if (dich.VaiTro === 'admin') {
    const soAdmin = await pool.request().query(`SELECT COUNT(*) AS cnt FROM TaiKhoan WHERE VaiTro = 'admin'`);
    if (soAdmin.recordset[0].cnt <= 1) {
      return res.status(409).json({ message: 'Phải còn ít nhất 1 quản trị viên trong hệ thống' });
    }
  }

  await pool.request().input('id', id).input('vt', req.body.vaiTro).query('UPDATE TaiKhoan SET VaiTro = @vt WHERE Id = @id');
  await ghiNhatKyThayDoi('TaiKhoan', id, { VaiTro: dich.VaiTro }, { VaiTro: req.body.vaiTro }, req.user.id);
  res.json({ message: 'Đã đổi vai trò (có hiệu lực tối đa sau 15 phút hoặc khi người dùng đăng nhập lại)', VaiTro: req.body.vaiTro });
});

// ---- Gắn / gỡ hồ sơ nhân viên (admin, HR) ----------------------------------
router.put('/:id/gan-nhan-vien', ...quanTri, validate(GanNhanVienSchema), async (req, res) => {
  const id = layId(req);
  const { nhanVienId } = req.body;
  const pool = await getPool();
  const dich = await layTaiKhoan(pool, id);
  if (!dich) return res.status(404).json({ message: 'Không tìm thấy tài khoản' });
  if (hrKhongDuocDongVaoQuanTri(req.user, dich)) {
    return res.status(403).json({ message: 'HR chỉ được thao tác trên tài khoản nhân viên' });
  }

  if (nhanVienId) {
    const loi = await kiemTraCoTheGan(pool, nhanVienId, id);
    if (loi) return res.status(loi.status).json({ message: loi.message, truong: 'nhanVienId' });
  }

  await pool.request().input('id', id).input('nv', sql.Int, nhanVienId).query('UPDATE TaiKhoan SET NhanVienId = @nv WHERE Id = @id');
  await ghiNhatKyThayDoi('TaiKhoan', id, { NhanVienId: dich.NhanVienId }, { NhanVienId: nhanVienId }, req.user.id);
  res.json({ message: nhanVienId ? 'Đã gắn hồ sơ nhân viên' : 'Đã gỡ liên kết hồ sơ', NhanVienId: nhanVienId });
});

// ---- Đặt lại mật khẩu cho người khác (admin; HR chỉ với tài khoản nhân viên)
router.put('/:id/dat-lai-mat-khau', ...quanTri, validate(AdminDatLaiMatKhauSchema), async (req, res) => {
  const id = layId(req);
  const pool = await getPool();
  const dich = await layTaiKhoan(pool, id);
  if (!dich) return res.status(404).json({ message: 'Không tìm thấy tài khoản' });
  if (hrKhongDuocDongVaoQuanTri(req.user, dich)) {
    return res.status(403).json({ message: 'HR chỉ được đặt lại mật khẩu cho tài khoản nhân viên' });
  }

  const hash = await bcrypt.hash(req.body.matKhauMoi, 10);
  await pool.request().input('id', id).input('h', hash).query('UPDATE TaiKhoan SET MatKhauMaHoa = @h WHERE Id = @id');
  await pool.request().input('id', id).query('UPDATE RefreshToken SET DaThuHoi = 1 WHERE TaiKhoanId = @id AND DaThuHoi = 0');
  // KHÔNG ghi giá trị mật khẩu/hash vào nhật ký
  await ghiNhatKyThayDoi('TaiKhoan', id, { MatKhau: '(cũ)' }, { MatKhau: '(đã đặt lại bởi quản trị)' }, req.user.id);
  res.json({ message: 'Đã đặt lại mật khẩu, người dùng cần đăng nhập lại' });
});

module.exports = router;
