require('dotenv').config();
const bcrypt = require('bcrypt');
const { getPool, sql } = require('../src/db');

/**
 * Dữ liệu mẫu Giai đoạn 2 — chạy lại nhiều lần an toàn (kiểm tra tồn tại trước khi thêm).
 *   node scripts/seedGiaiDoan2.js
 * Tài khoản tạo ra (mật khẩu đều thỏa chính sách ≥8 ký tự, có chữ và số):
 *   hr01  / Hr@12345  — vai trò HR, gắn hồ sơ NV0002
 *   nv01  / Nv@12345  — nhân viên, gắn hồ sơ NV0001   (xem được dữ liệu)
 *   nv02  / Nv@12345  — nhân viên CHƯA gắn hồ sơ       (bị chặn xem dữ liệu)
 * Đặt ADMIN_EMAIL=email-that-cua-ban trong .env để admin có email nhận mã quên mật khẩu.
 */
async function chen(pool, truyVan, tham = {}) {
  const rq = pool.request();
  for (const [k, v] of Object.entries(tham)) rq.input(k, v);
  const r = await rq.query(truyVan);
  return r.recordset?.[0]?.Id;
}

async function seedToChuc(pool) {
  const daCo = await pool.request().query(`SELECT COUNT(*) AS cnt FROM PhongBan WHERE Ten = N'Công ty ABC' AND DaXoa = 0`);
  if (daCo.recordset[0].cnt > 0) {
    console.log('• Cây tổ chức mẫu đã có, bỏ qua.');
    return;
  }

  const pb = (ten, ma, cha, thuTu) =>
    chen(
      pool,
      `INSERT INTO PhongBan (Ten, MaPhongBan, PhongBanChaId, ThuTu) OUTPUT INSERTED.Id VALUES (@ten, @ma, @cha, @thuTu)`,
      { ten, ma, cha: cha ?? null, thuTu }
    );

  const cty = await pb('Công ty ABC', 'ABC', null, 1);
  const khoiCN = await pb('Khối Công nghệ', 'KCN', cty, 1);
  const khoiVH = await pb('Khối Vận hành', 'KVH', cty, 2);
  const kt = await pb('Phòng Kỹ thuật', 'KT', khoiCN, 1);
  const qa = await pb('Phòng QA', 'QA', khoiCN, 2);
  const ns = await pb('Phòng Nhân sự', 'NS', khoiVH, 1);
  const ketToan = await pb('Phòng Kế toán', 'KETOAN', khoiVH, 2);

  const cd = async (ten) =>
    (await chen(pool, `SELECT Id FROM ChucDanh WHERE Ten = @ten AND DaXoa = 0`, { ten })) ??
    chen(pool, `INSERT INTO ChucDanh (Ten) OUTPUT INSERTED.Id VALUES (@ten)`, { ten });
  const cdKySu = await cd('Kỹ sư phần mềm');
  const cdTest = await cd('Kiểm thử viên');
  const cdCVNS = await cd('Chuyên viên nhân sự');
  const cdKeToan = await cd('Kế toán viên');
  const cdTruongNhom = await cd('Trưởng nhóm');

  const cv = (ten, thuTu) =>
    chen(pool, `INSERT INTO ChucVu (Ten, PhongBanId, ThuTu) OUTPUT INSERTED.Id VALUES (@ten, NULL, @thuTu)`, { ten, thuTu });
  await cv('Giám đốc', 1);
  const cvTruongPhong = await cv('Trưởng phòng', 2);
  await cv('Phó phòng', 3);
  const cvNhanVien = await cv('Nhân viên', 9);

  const nam = new Date().getFullYear();
  const db = (phongBanId, chucDanhId, soLuong) =>
    chen(
      pool,
      `INSERT INTO DinhBienViTri (PhongBanId, ChucDanhId, Nam, SoLuongDuocDuyet) OUTPUT INSERTED.Id VALUES (@pb, @cd, @nam, @sl)`,
      { pb: phongBanId, cd: chucDanhId, nam, sl: soLuong }
    );
  await db(kt, cdKySu, 4);
  await db(kt, cdTruongNhom, 1);
  await db(qa, cdTest, 2);
  await db(ns, cdCVNS, 2);
  await db(ketToan, cdKeToan, 2);

  const nv = (ma, hoTen, cccd, phongBanId, chucVuId, chucDanhId) =>
    chen(
      pool,
      `INSERT INTO NhanVien (MaNhanVien, HoTen, SoCCCD, PhongBanId, ChucVuId, ChucDanhId)
       OUTPUT INSERTED.Id VALUES (@ma, @hoTen, @cccd, @pb, @cv, @cd)`,
      { ma, hoTen, cccd, pb: phongBanId, cv: chucVuId, cd: chucDanhId }
    );
  await nv('NV0001', 'Nguyễn Văn An', '001090000001', kt, cvNhanVien, cdKySu);
  await nv('NV0002', 'Trần Thị Bình', '001090000002', ns, cvNhanVien, cdCVNS);
  await nv('NV0003', 'Lê Văn Cường', '001090000003', kt, cvTruongPhong, cdTruongNhom);

  console.log('• Đã tạo cây tổ chức: 7 phòng ban, 5 chức danh, 4 chức vụ, 5 dòng định biên, 3 nhân viên mẫu.');
}

async function seedTaiKhoan(pool) {
  const tk = async (tenDangNhap, matKhau, vaiTro, email, maNhanVien) => {
    const daCo = await pool.request().input('u', tenDangNhap).query('SELECT COUNT(*) AS cnt FROM TaiKhoan WHERE TenDangNhap = @u');
    if (daCo.recordset[0].cnt > 0) return console.log(`• Tài khoản ${tenDangNhap} đã có, bỏ qua.`);
    const nvId = maNhanVien
      ? await chen(pool, 'SELECT Id FROM NhanVien WHERE MaNhanVien = @ma', { ma: maNhanVien })
      : null;
    await pool
      .request()
      .input('u', tenDangNhap)
      .input('e', email)
      .input('p', await bcrypt.hash(matKhau, 10))
      .input('vt', vaiTro)
      .input('nv', sql.Int, nvId ?? null)
      .query(`INSERT INTO TaiKhoan (TenDangNhap, Email, MatKhauMaHoa, VaiTro, NhanVienId) VALUES (@u, @e, @p, @vt, @nv)`);
    console.log(`• Đã tạo tài khoản ${tenDangNhap} (${vaiTro})${maNhanVien ? ' gắn ' + maNhanVien : ' — chưa gắn hồ sơ'}`);
  };
  await tk('hr01', 'Hr@12345', 'hr', 'hr01@example.com', 'NV0002');
  await tk('nv01', 'Nv@12345', 'nhan_vien', 'nv01@example.com', 'NV0001');
  await tk('nv02', 'Nv@12345', 'nhan_vien', 'nv02@example.com', null);

  if (process.env.ADMIN_EMAIL) {
    await pool
      .request()
      .input('e', process.env.ADMIN_EMAIL.toLowerCase())
      .query(`UPDATE TaiKhoan SET Email = @e WHERE TenDangNhap = 'admin' AND Email IS NULL`);
    console.log(`• Đã đặt email cho admin (nếu trước đó chưa có): ${process.env.ADMIN_EMAIL}`);
  }
}

(async () => {
  const pool = await getPool();
  await seedToChuc(pool);
  await seedTaiKhoan(pool);
  console.log('Seed Giai đoạn 2 hoàn tất.');
  process.exit(0);
})().catch((err) => {
  console.error('Seed thất bại:', err.message);
  process.exit(1);
});
