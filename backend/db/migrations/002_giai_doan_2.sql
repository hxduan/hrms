-- ============================================================
-- MIGRATION 002 — Giai đoạn 2 (Tổ chức) + vá lỗi xác thực Giai đoạn 1
-- Chạy trên database `hrms` ĐÃ có schema.sql của Giai đoạn 1.
-- An toàn khi chạy lại nhiều lần (có kiểm tra tồn tại trước khi tạo).
-- Dùng Azure Data Studio / SSMS (có hỗ trợ lệnh GO).
-- ============================================================

-- ---------- 0. KIỂM TRA ĐIỀU KIỆN TRƯỚC KHI CHẠY ----------
-- Database phải được tạo từ db/schema.sql của Giai đoạn 1 (đúng thứ tự cha-con, có NhanVien,
-- DinhBienViTri.ChucDanhId, TaiKhoan có cột mật khẩu, View_TinhTrangDinhBien). Nếu database của bạn
-- còn là bản tạo tay từ trước (ví dụ DinhBienViTri còn cột ChucVuId, chưa có NhanVien) thì
-- dừng lại: script bên dưới sẽ KHÔNG chạy để tránh làm hỏng dữ liệu.
IF OBJECT_ID('NhanVien', 'U') IS NULL
   OR OBJECT_ID('View_TinhTrangDinhBien', 'V') IS NULL
   OR COL_LENGTH('DinhBienViTri', 'ChucDanhId') IS NULL
   OR (COL_LENGTH('TaiKhoan', 'MatKhauMaHoa') IS NULL AND COL_LENGTH('TaiKhoan', 'MatKhau') IS NULL)
   OR OBJECT_ID('RefreshToken', 'U') IS NULL
   OR OBJECT_ID('NhatKyThayDoi', 'U') IS NULL
BEGIN
  RAISERROR(N'Database chưa đúng schema Giai đoạn 1. Hãy tạo database mới rồi chạy db/schema.sql trước, sau đó mới chạy migration này.', 16, 1);
  SET NOEXEC ON; -- bỏ qua mọi lệnh phía sau trong phiên làm việc này
END
GO

-- Chuẩn hóa tên cột hash theo API Giai đoạn 2, đồng thời giữ nguyên mật khẩu
-- bcrypt của database Giai đoạn 1 đang dùng tên cột MatKhau.
IF COL_LENGTH('TaiKhoan', 'MatKhauMaHoa') IS NULL
  ALTER TABLE TaiKhoan ADD MatKhauMaHoa NVARCHAR(255) NULL;
GO

IF COL_LENGTH('TaiKhoan', 'MatKhau') IS NOT NULL
  EXEC sp_executesql N'UPDATE TaiKhoan SET MatKhauMaHoa = MatKhau WHERE MatKhauMaHoa IS NULL';
GO

-- ---------- A. VÁ XÁC THỰC: thêm Email cho TaiKhoan ----------
-- Lý do: "Quên mật khẩu" ở Giai đoạn 1 gửi mã khôi phục tới địa chỉ email do
-- NGƯỜI YÊU CẦU gõ vào, không phải email của chủ tài khoản => ai biết tên đăng
-- nhập cũng chiếm được tài khoản. Từ nay mã chỉ gửi tới Email lưu trong DB.
IF COL_LENGTH('TaiKhoan', 'Email') IS NULL
  ALTER TABLE TaiKhoan ADD Email NVARCHAR(255) NULL;
GO

IF COL_LENGTH('TaiKhoan', 'MaKhoiPhucMatKhau') IS NULL
  ALTER TABLE TaiKhoan ADD MaKhoiPhucMatKhau CHAR(64) NULL;
GO

IF COL_LENGTH('TaiKhoan', 'HanKhoiPhuc') IS NULL
  ALTER TABLE TaiKhoan ADD HanKhoiPhuc DATETIME NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_TaiKhoan_Email' AND object_id = OBJECT_ID('TaiKhoan'))
  CREATE UNIQUE INDEX UX_TaiKhoan_Email ON TaiKhoan (Email) WHERE Email IS NOT NULL;
GO

-- ---------- B. PHÒNG BAN: mã + thứ tự hiển thị ----------
IF COL_LENGTH('PhongBan', 'MaPhongBan') IS NULL
  ALTER TABLE PhongBan ADD MaPhongBan NVARCHAR(30) NULL;
GO

IF COL_LENGTH('PhongBan', 'ThuTu') IS NULL
  ALTER TABLE PhongBan ADD ThuTu INT NOT NULL CONSTRAINT DF_PhongBan_ThuTu DEFAULT 0;
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_PhongBan_ThuTu')
  ALTER TABLE PhongBan ADD CONSTRAINT CK_PhongBan_ThuTu CHECK (ThuTu BETWEEN 0 AND 9999);
GO

-- Tên phòng ban không trùng trong cùng 1 đơn vị cha (chỉ xét bản ghi chưa xóa mềm).
-- Lưu ý: SQL Server coi NULL = NULL trong chỉ mục duy nhất => 2 phòng ban GỐC
-- cùng tên cũng bị chặn, đúng ý muốn.
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_PhongBan_TenTrongCha' AND object_id = OBJECT_ID('PhongBan'))
  CREATE UNIQUE INDEX UX_PhongBan_TenTrongCha ON PhongBan (PhongBanChaId, Ten) WHERE DaXoa = 0;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_PhongBan_Ma' AND object_id = OBJECT_ID('PhongBan'))
  CREATE UNIQUE INDEX UX_PhongBan_Ma ON PhongBan (MaPhongBan) WHERE MaPhongBan IS NOT NULL AND DaXoa = 0;
GO

-- ---------- C. CHỨC VỤ: thứ tự (cấp bậc) ----------
IF COL_LENGTH('ChucVu', 'ThuTu') IS NULL
  ALTER TABLE ChucVu ADD ThuTu INT NOT NULL CONSTRAINT DF_ChucVu_ThuTu DEFAULT 0;
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_ChucVu_ThuTu')
  ALTER TABLE ChucVu ADD CONSTRAINT CK_ChucVu_ThuTu CHECK (ThuTu BETWEEN 0 AND 9999);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_ChucVu_TenTrongPhongBan' AND object_id = OBJECT_ID('ChucVu'))
  CREATE UNIQUE INDEX UX_ChucVu_TenTrongPhongBan ON ChucVu (PhongBanId, Ten) WHERE DaXoa = 0;
GO

-- ---------- D. CHỨC DANH: tên duy nhất ----------
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_ChucDanh_Ten' AND object_id = OBJECT_ID('ChucDanh'))
  CREATE UNIQUE INDEX UX_ChucDanh_Ten ON ChucDanh (Ten) WHERE DaXoa = 0;
GO

-- ---------- E. ĐỊNH BIÊN: chặn năm vô lý ----------
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_DinhBien_Nam')
  ALTER TABLE DinhBienViTri ADD CONSTRAINT CK_DinhBien_Nam CHECK (Nam BETWEEN 2000 AND 2100);
GO

-- ---------- F. STORED PROCEDURE: cây phòng ban có thứ tự cha-con ----------
-- Trả về các phòng ban theo ĐÚNG thứ tự hiển thị của cây: cha đứng trước con,
-- các anh em cùng cấp sắp theo ThuTu rồi tới Id. Cột Cap = độ sâu (0 = gốc).
-- KhoaSapXep ghép "ThuTu-Id" của từng tổ tiên nên ORDER BY 1 cột là đủ.
CREATE OR ALTER PROCEDURE sp_LayCayPhongBan
  @TuKhoa NVARCHAR(200) = NULL
AS
BEGIN
  SET NOCOUNT ON;

  ;WITH Cay AS (
    SELECT p.Id, p.Ten, p.MaPhongBan, p.PhongBanChaId, p.ThuTu,
           CAST(0 AS INT) AS Cap,
           CAST(RIGHT('0000' + CAST(p.ThuTu AS VARCHAR(4)), 4) + '-' +
                RIGHT('0000000000' + CAST(p.Id AS VARCHAR(10)), 10) AS VARCHAR(4000)) AS KhoaSapXep
    FROM PhongBan p
    WHERE p.PhongBanChaId IS NULL AND p.DaXoa = 0

    UNION ALL

    SELECT c.Id, c.Ten, c.MaPhongBan, c.PhongBanChaId, c.ThuTu,
           CAST(t.Cap + 1 AS INT),
           CAST(t.KhoaSapXep + '/' +
                RIGHT('0000' + CAST(c.ThuTu AS VARCHAR(4)), 4) + '-' +
                RIGHT('0000000000' + CAST(c.Id AS VARCHAR(10)), 10) AS VARCHAR(4000))
    FROM PhongBan c
    JOIN Cay t ON c.PhongBanChaId = t.Id
    WHERE c.DaXoa = 0
  )
  SELECT cay.Id, cay.Ten, cay.MaPhongBan, cay.PhongBanChaId,
         cha.Ten AS TenPhongBanCha,
         cay.ThuTu, cay.Cap,
         (SELECT COUNT(*) FROM PhongBan x WHERE x.PhongBanChaId = cay.Id AND x.DaXoa = 0) AS SoPhongBanCon,
         (SELECT COUNT(*) FROM ChucVu cv WHERE cv.PhongBanId = cay.Id AND cv.DaXoa = 0) AS SoChucVu,
         (SELECT COUNT(*) FROM NhanVien nv
            WHERE nv.PhongBanId = cay.Id AND nv.DangLamViec = 1 AND nv.DaXoa = 0) AS SoNhanVien
  FROM Cay cay
  LEFT JOIN PhongBan cha ON cha.Id = cay.PhongBanChaId
  WHERE @TuKhoa IS NULL
     OR cay.Ten LIKE N'%' + @TuKhoa + N'%'
     OR cay.MaPhongBan LIKE N'%' + @TuKhoa + N'%'
  ORDER BY cay.KhoaSapXep
  OPTION (MAXRECURSION 50);
END;
GO

-- ---------- G. STORED PROCEDURE: báo cáo định biên theo năm ----------
-- "Đang giữ" là số nhân viên ĐANG làm việc tại thời điểm hiện tại (không phải
-- số liệu lịch sử của năm @Nam) — giao diện ghi rõ "(hiện tại)".
CREATE OR ALTER PROCEDURE sp_BaoCaoDinhBien
  @Nam INT,
  @PhongBanId INT = NULL
AS
BEGIN
  SET NOCOUNT ON;
  SELECT v.DinhBienId AS Id, v.PhongBanId, pb.Ten AS TenPhongBan,
         v.ChucDanhId, cd.Ten AS TenChucDanh, v.Nam,
         v.SoLuongDuocDuyet, v.SoLuongDangGiu, v.ConLai,
         CASE WHEN v.ConLai > 0 THEN 'thieu' WHEN v.ConLai = 0 THEN 'du' ELSE 'vuot' END AS TinhTrang,
         db.GhiChu
  FROM View_TinhTrangDinhBien v
  JOIN DinhBienViTri db ON db.Id = v.DinhBienId
  JOIN PhongBan pb ON pb.Id = v.PhongBanId AND pb.DaXoa = 0
  JOIN ChucDanh cd ON cd.Id = v.ChucDanhId AND cd.DaXoa = 0
  WHERE v.Nam = @Nam AND (@PhongBanId IS NULL OR v.PhongBanId = @PhongBanId)
  ORDER BY pb.Ten, cd.Ten;
END;
GO

PRINT 'Migration 002 hoàn tất.';

SET NOEXEC OFF;
