-- ============================================================
-- MIGRATION 004 — Giai đoạn 3: Hồ sơ nhân viên
-- Chạy SAU 003. Yêu cầu SQL Server 2017+ (dùng STRING_AGG, SEQUENCE). Chạy lại nhiều lần an toàn.
-- ============================================================

IF COL_LENGTH('TaiKhoan', 'HoatDong') IS NULL OR OBJECT_ID('NhanVien', 'U') IS NULL
BEGIN
  RAISERROR(N'Chưa chạy migration 002/003. Hãy chạy theo thứ tự trước.', 16, 1);
  SET NOEXEC ON;
END
GO

-- ---------- Tiện ích dùng chung cho các migration sau: gỡ ràng buộc KHÔNG ĐẶT TÊN theo cột ----------
-- schema.sql tạo nhiều ràng buộc không đặt tên (SQL Server tự sinh tên ngẫu nhiên) nên phải tra tên động.
CREATE OR ALTER PROCEDURE sp_GoRangBuocTheoCot
  @Bang SYSNAME, @Cot SYSNAME, @Loai VARCHAR(10)   -- 'DEFAULT' | 'CHECK' | 'UNIQUE'
AS
BEGIN
  SET NOCOUNT ON;
  DECLARE @sql NVARCHAR(MAX);

  IF @Loai = 'DEFAULT'
    SELECT @sql = STRING_AGG(CAST(N'ALTER TABLE ' + QUOTENAME(@Bang) + N' DROP CONSTRAINT ' + QUOTENAME(dc.name) AS NVARCHAR(MAX)), N'; ')
    FROM sys.default_constraints dc
    JOIN sys.columns c ON c.object_id = dc.parent_object_id AND c.column_id = dc.parent_column_id
    WHERE dc.parent_object_id = OBJECT_ID(@Bang) AND c.name = @Cot;

  ELSE IF @Loai = 'CHECK'
    SELECT @sql = STRING_AGG(CAST(N'ALTER TABLE ' + QUOTENAME(@Bang) + N' DROP CONSTRAINT ' + QUOTENAME(cc.name) AS NVARCHAR(MAX)), N'; ')
    FROM sys.check_constraints cc
    WHERE cc.parent_object_id = OBJECT_ID(@Bang) AND cc.definition LIKE N'%[[]' + @Cot + N']%';

  ELSE IF @Loai = 'UNIQUE'
    SELECT @sql = STRING_AGG(CAST(N'ALTER TABLE ' + QUOTENAME(@Bang) + N' DROP CONSTRAINT ' + QUOTENAME(kc.name) AS NVARCHAR(MAX)), N'; ')
    FROM sys.key_constraints kc
    WHERE kc.parent_object_id = OBJECT_ID(@Bang) AND kc.type = 'UQ'
      AND (SELECT COUNT(*) FROM sys.index_columns ic WHERE ic.object_id = kc.parent_object_id AND ic.index_id = kc.unique_index_id) = 1
      AND EXISTS (SELECT 1 FROM sys.index_columns ic
                  JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
                  WHERE ic.object_id = kc.parent_object_id AND ic.index_id = kc.unique_index_id AND c.name = @Cot);

  IF @sql IS NOT NULL EXEC sp_executesql @sql;
END;
GO

-- ---------- Mã nhân viên: SEQUENCE (hai người tạo cùng lúc không bao giờ trùng mã) ----------
IF NOT EXISTS (SELECT 1 FROM sys.sequences WHERE name = 'SeqMaNhanVien')
BEGIN
  DECLARE @max INT = ISNULL((SELECT MAX(TRY_CAST(SUBSTRING(MaNhanVien, 3, 10) AS INT)) FROM NhanVien WHERE MaNhanVien LIKE 'NV[0-9]%'), 0);
  DECLARE @s NVARCHAR(200) = N'CREATE SEQUENCE SeqMaNhanVien AS INT START WITH ' + CAST(@max + 1 AS NVARCHAR(10)) + N' INCREMENT BY 1';
  EXEC sp_executesql @s;
END
GO

-- ---------- Địa chỉ 2 cấp (tỉnh/thành -> phường/xã) ----------
IF COL_LENGTH('NhanVien', 'QuanHuyen') IS NOT NULL AND COL_LENGTH('NhanVien', 'PhuongXa') IS NULL
  EXEC sp_rename 'NhanVien.QuanHuyen', 'PhuongXa', 'COLUMN';
GO

-- ---------- Cột mới của NhanVien ----------
IF COL_LENGTH('NhanVien', 'MaTinh') IS NULL      ALTER TABLE NhanVien ADD MaTinh NVARCHAR(10) NULL;
IF COL_LENGTH('NhanVien', 'MaPhuongXa') IS NULL  ALTER TABLE NhanVien ADD MaPhuongXa NVARCHAR(10) NULL;
IF COL_LENGTH('NhanVien', 'Email') IS NULL       ALTER TABLE NhanVien ADD Email NVARCHAR(255) NULL;
IF COL_LENGTH('NhanVien', 'NgayVaoLam') IS NULL  ALTER TABLE NhanVien ADD NgayVaoLam DATE NULL;
IF COL_LENGTH('NhanVien', 'SoSoBHXH') IS NULL    ALTER TABLE NhanVien ADD SoSoBHXH NVARCHAR(15) NULL;
IF COL_LENGTH('NhanVien', 'MaSoThue') IS NULL    ALTER TABLE NhanVien ADD MaSoThue NVARCHAR(15) NULL;
GO
IF COL_LENGTH('NhanVien', 'VungLuong') IS NULL
  ALTER TABLE NhanVien ADD VungLuong TINYINT NOT NULL CONSTRAINT DF_NhanVien_VungLuong DEFAULT 1;
GO
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_NhanVien_VungLuong')
  ALTER TABLE NhanVien ADD CONSTRAINT CK_NhanVien_VungLuong CHECK (VungLuong BETWEEN 1 AND 4);
GO

-- ---------- Duy nhất CHỈ xét bản ghi chưa xóa mềm (tạo nhầm rồi xóa vẫn nhập lại được) ----------
EXEC sp_GoRangBuocTheoCot 'NhanVien', 'SoCCCD', 'UNIQUE';
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_NhanVien_CCCD' AND object_id = OBJECT_ID('NhanVien'))
  CREATE UNIQUE INDEX UX_NhanVien_CCCD ON NhanVien (SoCCCD) WHERE DaXoa = 0 AND SoCCCD IS NOT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_NhanVien_Email' AND object_id = OBJECT_ID('NhanVien'))
  CREATE UNIQUE INDEX UX_NhanVien_Email ON NhanVien (Email) WHERE DaXoa = 0 AND Email IS NOT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_NhanVien_BHXH' AND object_id = OBJECT_ID('NhanVien'))
  CREATE UNIQUE INDEX UX_NhanVien_BHXH ON NhanVien (SoSoBHXH) WHERE DaXoa = 0 AND SoSoBHXH IS NOT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_NhanVien_MST' AND object_id = OBJECT_ID('NhanVien'))
  CREATE UNIQUE INDEX UX_NhanVien_MST ON NhanVien (MaSoThue) WHERE DaXoa = 0 AND MaSoThue IS NOT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_NhanVien_PhongBan_ChucDanh' AND object_id = OBJECT_ID('NhanVien'))
  CREATE INDEX IX_NhanVien_PhongBan_ChucDanh ON NhanVien (PhongBanId, ChucDanhId) INCLUDE (DangLamViec, DaXoa);
GO

-- ---------- Thông tin tổng quan 1 nhân viên (ngày trả về dạng chuỗi YYYY-MM-DD, không lệch múi giờ) ----------
CREATE OR ALTER PROCEDURE sp_LayThongTinTongQuanNhanVien
  @NhanVienId INT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT nv.Id, nv.MaNhanVien, nv.HoTen, nv.GioiTinh,
         CONVERT(VARCHAR(10), nv.NgaySinh, 23) AS NgaySinh,
         nv.SoCCCD, nv.SoDienThoai, nv.Email,
         nv.Tinh, nv.MaTinh, nv.PhuongXa, nv.MaPhuongXa, nv.DiaChiChiTiet,
         nv.PhongBanId, pb.Ten AS TenPhongBan,
         nv.ChucVuId, cv.Ten AS TenChucVu,
         nv.ChucDanhId, cd.Ten AS TenChucDanh,
         CONVERT(VARCHAR(10), nv.NgayVaoLam, 23) AS NgayVaoLam,
         nv.SoSoBHXH, nv.MaSoThue, nv.VungLuong,
         nv.TenNganHang, nv.SoTaiKhoanNganHang, nv.DangLamViec,
         tk.Id AS TaiKhoanId, tk.TenDangNhap, tk.VaiTro AS VaiTroTaiKhoan, tk.HoatDong AS TaiKhoanHoatDong
  FROM NhanVien nv
  LEFT JOIN PhongBan pb ON pb.Id = nv.PhongBanId
  LEFT JOIN ChucVu cv ON cv.Id = nv.ChucVuId
  LEFT JOIN ChucDanh cd ON cd.Id = nv.ChucDanhId
  LEFT JOIN TaiKhoan tk ON tk.NhanVienId = nv.Id
  WHERE nv.Id = @NhanVienId AND nv.DaXoa = 0;
END;
GO

-- ---------- Danh sách phân trang / lọc / sắp xếp PHÍA MÁY CHỦ ----------
CREATE OR ALTER PROCEDURE sp_DanhSachNhanVien
  @Tim NVARCHAR(200) = NULL,
  @PhongBanId INT = NULL,
  @ChucDanhId INT = NULL,
  @TrangThai VARCHAR(10) = NULL,          -- 'dang_lam' | 'da_nghi' | NULL = tất cả
  @SapXep VARCHAR(30) = 'MaNhanVien',
  @Huong VARCHAR(4) = 'ASC',
  @Trang INT = 1,
  @SoDong INT = 20
AS
BEGIN
  SET NOCOUNT ON;
  IF @Trang < 1 SET @Trang = 1;
  IF @SoDong < 1 SET @SoDong = 20;
  IF @SoDong > 200 SET @SoDong = 200;
  DECLARE @cot VARCHAR(30) = CASE WHEN @SapXep IN ('MaNhanVien','HoTen','NgayVaoLam','TenPhongBan','TenChucDanh') THEN @SapXep ELSE 'MaNhanVien' END;
  DECLARE @giam BIT = CASE WHEN UPPER(@Huong) = 'DESC' THEN 1 ELSE 0 END;

  SELECT nv.Id, nv.MaNhanVien, nv.HoTen, nv.GioiTinh, nv.SoDienThoai, nv.Email,
         CONVERT(VARCHAR(10), nv.NgayVaoLam, 23) AS NgayVaoLam,
         nv.PhongBanId, pb.Ten AS TenPhongBan, nv.ChucVuId, cv.Ten AS TenChucVu,
         nv.ChucDanhId, cd.Ten AS TenChucDanh, nv.DangLamViec,
         CAST(CASE WHEN EXISTS (SELECT 1 FROM TaiKhoan tk WHERE tk.NhanVienId = nv.Id) THEN 1 ELSE 0 END AS BIT) AS CoTaiKhoan,
         COUNT(*) OVER () AS TongSo
  FROM NhanVien nv
  LEFT JOIN PhongBan pb ON pb.Id = nv.PhongBanId
  LEFT JOIN ChucVu cv ON cv.Id = nv.ChucVuId
  LEFT JOIN ChucDanh cd ON cd.Id = nv.ChucDanhId
  WHERE nv.DaXoa = 0
    AND (@PhongBanId IS NULL OR nv.PhongBanId = @PhongBanId)
    AND (@ChucDanhId IS NULL OR nv.ChucDanhId = @ChucDanhId)
    AND (@TrangThai IS NULL OR (@TrangThai = 'dang_lam' AND nv.DangLamViec = 1) OR (@TrangThai = 'da_nghi' AND nv.DangLamViec = 0))
    AND (@Tim IS NULL
         OR nv.HoTen COLLATE Vietnamese_CI_AI LIKE N'%' + @Tim + N'%'
         OR nv.MaNhanVien LIKE N'%' + @Tim + N'%'
         OR nv.SoDienThoai LIKE N'%' + @Tim + N'%'
         OR nv.Email LIKE N'%' + @Tim + N'%'
         OR nv.SoCCCD LIKE N'%' + @Tim + N'%')
  ORDER BY
    CASE WHEN @cot = 'MaNhanVien' AND @giam = 0 THEN nv.MaNhanVien END ASC,
    CASE WHEN @cot = 'MaNhanVien' AND @giam = 1 THEN nv.MaNhanVien END DESC,
    CASE WHEN @cot = 'HoTen' AND @giam = 0 THEN nv.HoTen COLLATE Vietnamese_CI_AI END ASC,
    CASE WHEN @cot = 'HoTen' AND @giam = 1 THEN nv.HoTen COLLATE Vietnamese_CI_AI END DESC,
    CASE WHEN @cot = 'NgayVaoLam' AND @giam = 0 THEN nv.NgayVaoLam END ASC,
    CASE WHEN @cot = 'NgayVaoLam' AND @giam = 1 THEN nv.NgayVaoLam END DESC,
    CASE WHEN @cot = 'TenPhongBan' AND @giam = 0 THEN pb.Ten END ASC,
    CASE WHEN @cot = 'TenPhongBan' AND @giam = 1 THEN pb.Ten END DESC,
    CASE WHEN @cot = 'TenChucDanh' AND @giam = 0 THEN cd.Ten END ASC,
    CASE WHEN @cot = 'TenChucDanh' AND @giam = 1 THEN cd.Ten END DESC,
    nv.Id
  OFFSET (@Trang - 1) * @SoDong ROWS FETCH NEXT @SoDong ROWS ONLY;
END;
GO

PRINT 'Migration 004 hoàn tất.';
SET NOEXEC OFF;
