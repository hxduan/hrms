-- ============================================================
-- MIGRATION 005 — Giai đoạn 4: Hợp đồng, quá trình công tác, nghỉ việc, phụ cấp, người phụ thuộc
-- Chạy SAU 004. Chạy lại nhiều lần an toàn.
-- ============================================================

IF OBJECT_ID('sp_GoRangBuocTheoCot', 'P') IS NULL OR NOT EXISTS (SELECT 1 FROM sys.sequences WHERE name = 'SeqMaNhanVien')
BEGIN
  RAISERROR(N'Chưa chạy migration 004. Hãy chạy theo thứ tự trước.', 16, 1);
  SET NOEXEC ON;
END
GO

-- ---------- LoaiHopDong: cờ đóng bảo hiểm + cách tính thuế ----------
IF COL_LENGTH('LoaiHopDong', 'CoDongBaoHiem') IS NULL
  ALTER TABLE LoaiHopDong ADD CoDongBaoHiem BIT NOT NULL CONSTRAINT DF_LoaiHopDong_BH DEFAULT 1;
IF COL_LENGTH('LoaiHopDong', 'KieuTinhThue') IS NULL
  ALTER TABLE LoaiHopDong ADD KieuTinhThue NVARCHAR(12) NOT NULL CONSTRAINT DF_LoaiHopDong_Thue DEFAULT 'luy_tien';
GO
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_LoaiHopDong_KieuThue')
  ALTER TABLE LoaiHopDong ADD CONSTRAINT CK_LoaiHopDong_KieuThue CHECK (KieuTinhThue IN ('luy_tien', 'khau_tru_10'));
GO
-- Tên danh mục không trùng (chỉ xét bản ghi chưa xóa mềm)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_LoaiHopDong_Ten' AND object_id = OBJECT_ID('LoaiHopDong'))
  CREATE UNIQUE INDEX UX_LoaiHopDong_Ten ON LoaiHopDong (Ten) WHERE DaXoa = 0;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_LyDoNghiViec_Ten' AND object_id = OBJECT_ID('LyDoNghiViec'))
  CREATE UNIQUE INDEX UX_LyDoNghiViec_Ten ON LyDoNghiViec (Ten) WHERE DaXoa = 0;
GO
-- Dữ liệu mẫu CHỈ khi bảng còn trống. Các cờ BH/thuế là cấu hình — cần kế toán xác nhận lại theo quy định hiện hành.
IF NOT EXISTS (SELECT 1 FROM LoaiHopDong WHERE DaXoa = 0)
  INSERT INTO LoaiHopDong (Ten, CoDongBaoHiem, KieuTinhThue) VALUES
    (N'Thử việc', 0, 'luy_tien'),
    (N'Xác định thời hạn', 1, 'luy_tien'),
    (N'Không xác định thời hạn', 1, 'luy_tien'),
    (N'Thời vụ dưới 3 tháng', 1, 'khau_tru_10');
IF NOT EXISTS (SELECT 1 FROM LyDoNghiViec WHERE DaXoa = 0)
  INSERT INTO LyDoNghiViec (Ten) VALUES
    (N'Xin thôi việc'), (N'Hết hạn hợp đồng'), (N'Kỷ luật / sa thải'), (N'Nghỉ hưu'), (N'Chuyển công tác'), (N'Lý do khác');
GO

-- ---------- HopDong ----------
IF COL_LENGTH('HopDong', 'SoHopDong') IS NULL      ALTER TABLE HopDong ADD SoHopDong NVARCHAR(50) NULL;
IF COL_LENGTH('HopDong', 'LuongDongBHXH') IS NULL  ALTER TABLE HopDong ADD LuongDongBHXH DECIMAL(18,2) NULL;
IF COL_LENGTH('HopDong', 'GhiChu') IS NULL         ALTER TABLE HopDong ADD GhiChu NVARCHAR(300) NULL;
IF COL_LENGTH('HopDong', 'DaXoa') IS NULL          ALTER TABLE HopDong ADD DaXoa BIT NOT NULL CONSTRAINT DF_HopDong_DaXoa DEFAULT 0;
GO
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_HopDong_Ngay')
  ALTER TABLE HopDong ADD CONSTRAINT CK_HopDong_Ngay CHECK (NgayKetThuc IS NULL OR NgayKetThuc >= NgayBatDau);
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_HopDong_Luong')
  ALTER TABLE HopDong ADD CONSTRAINT CK_HopDong_Luong CHECK (LuongCoBan IS NULL OR LuongCoBan > 0);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_HopDong_So' AND object_id = OBJECT_ID('HopDong'))
  CREATE UNIQUE INDEX UX_HopDong_So ON HopDong (SoHopDong) WHERE DaXoa = 0 AND SoHopDong IS NOT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_HopDong_NhanVien' AND object_id = OBJECT_ID('HopDong'))
  CREATE INDEX IX_HopDong_NhanVien ON HopDong (NhanVienId, NgayBatDau) INCLUDE (NgayKetThuc, DaXoa);
GO

-- ---------- QuaTrinhLamViec ----------
IF COL_LENGTH('QuaTrinhLamViec', 'ChucDanhId') IS NULL  ALTER TABLE QuaTrinhLamViec ADD ChucDanhId INT NULL;
IF COL_LENGTH('QuaTrinhLamViec', 'SoQuyetDinh') IS NULL ALTER TABLE QuaTrinhLamViec ADD SoQuyetDinh NVARCHAR(50) NULL;
IF COL_LENGTH('QuaTrinhLamViec', 'DaXoa') IS NULL       ALTER TABLE QuaTrinhLamViec ADD DaXoa BIT NOT NULL CONSTRAINT DF_QTLV_DaXoa DEFAULT 0;
IF COL_LENGTH('QuaTrinhLamViec', 'LoaiBienDong') IS NULL
  ALTER TABLE QuaTrinhLamViec ADD LoaiBienDong NVARCHAR(15) NOT NULL CONSTRAINT DF_QTLV_Loai DEFAULT 'dieu_chuyen';
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_QTLV_ChucDanh')
  ALTER TABLE QuaTrinhLamViec ADD CONSTRAINT FK_QTLV_ChucDanh FOREIGN KEY (ChucDanhId) REFERENCES ChucDanh(Id);
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_QTLV_Loai')
  ALTER TABLE QuaTrinhLamViec ADD CONSTRAINT CK_QTLV_Loai CHECK (LoaiBienDong IN ('bo_nhiem','dieu_chuyen','thang_chuc','giang_chuc','khac'));
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_QTLV_NhanVien' AND object_id = OBJECT_ID('QuaTrinhLamViec'))
  CREATE INDEX IX_QTLV_NhanVien ON QuaTrinhLamViec (NhanVienId, NgayHieuLuc) INCLUDE (DaXoa);
GO

-- ---------- Bổ sung lịch sử tiếp nhận cho nhân viên cũ chưa có quá trình công tác ----------
INSERT INTO QuaTrinhLamViec (NhanVienId, PhongBanId, ChucVuId, ChucDanhId, NgayHieuLuc, LoaiBienDong, GhiChu)
SELECT nv.Id, nv.PhongBanId, nv.ChucVuId, nv.ChucDanhId,
       ISNULL(nv.NgayVaoLam, CAST(GETDATE() AS DATE)), 'khac', N'Tiếp nhận (bổ sung tự động)'
FROM NhanVien nv
WHERE nv.DaXoa = 0 AND nv.PhongBanId IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM QuaTrinhLamViec q
    WHERE q.NhanVienId = nv.Id AND q.DaXoa = 0
  );
GO

-- ---------- NghiViec ----------
IF COL_LENGTH('NghiViec', 'NgayLamViecCuoi') IS NULL ALTER TABLE NghiViec ADD NgayLamViecCuoi DATE NULL;
IF COL_LENGTH('NghiViec', 'KhoaTaiKhoan') IS NULL
  ALTER TABLE NghiViec ADD KhoaTaiKhoan BIT NOT NULL CONSTRAINT DF_NghiViec_Khoa DEFAULT 1;
GO

-- ---------- PhuCapNhanVien ----------
IF COL_LENGTH('PhuCapNhanVien', 'MienThueToiDa') IS NULL ALTER TABLE PhuCapNhanVien ADD MienThueToiDa DECIMAL(18,2) NULL;
IF COL_LENGTH('PhuCapNhanVien', 'DaXoa') IS NULL         ALTER TABLE PhuCapNhanVien ADD DaXoa BIT NOT NULL CONSTRAINT DF_PCNV_DaXoa DEFAULT 0;
GO
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_PCNV_Ngay')
  ALTER TABLE PhuCapNhanVien ADD CONSTRAINT CK_PCNV_Ngay CHECK (NgayKetThuc IS NULL OR NgayKetThuc >= NgayHieuLuc);
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_PCNV_SoTien')
  ALTER TABLE PhuCapNhanVien ADD CONSTRAINT CK_PCNV_SoTien CHECK (SoTien > 0 AND (MienThueToiDa IS NULL OR MienThueToiDa >= 0));
GO

-- ---------- NguoiPhuThuocNhanVien ----------
IF COL_LENGTH('NguoiPhuThuocNhanVien', 'QuanHe') IS NULL    ALTER TABLE NguoiPhuThuocNhanVien ADD QuanHe NVARCHAR(50) NULL;
IF COL_LENGTH('NguoiPhuThuocNhanVien', 'NgaySinh') IS NULL  ALTER TABLE NguoiPhuThuocNhanVien ADD NgaySinh DATE NULL;
IF COL_LENGTH('NguoiPhuThuocNhanVien', 'MaSoThue') IS NULL  ALTER TABLE NguoiPhuThuocNhanVien ADD MaSoThue NVARCHAR(15) NULL;
IF COL_LENGTH('NguoiPhuThuocNhanVien', 'SoCCCD') IS NULL    ALTER TABLE NguoiPhuThuocNhanVien ADD SoCCCD NVARCHAR(20) NULL;
IF COL_LENGTH('NguoiPhuThuocNhanVien', 'DaXoa') IS NULL     ALTER TABLE NguoiPhuThuocNhanVien ADD DaXoa BIT NOT NULL CONSTRAINT DF_NPT_DaXoa DEFAULT 0;
GO
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_NPT_Ngay')
  ALTER TABLE NguoiPhuThuocNhanVien ADD CONSTRAINT CK_NPT_Ngay CHECK (NgayKetThucTinhGiamTru IS NULL OR NgayKetThucTinhGiamTru >= NgayBatDauTinhGiamTru);
GO

-- ---------- Đồng bộ định kỳ ----------
-- (1) Vị trí HIỆN TẠI của nhân viên = bản ghi quá trình có hiệu lực mới nhất không quá hôm nay
--     (điều chuyển có hiệu lực ngày mai thì hôm nay CHƯA đổi).
-- (2) Quyết định nghỉ việc tới hạn -> DangLamViec = 0; nếu chọn khóa thì khóa tài khoản + thu hồi phiên.
-- Gọi ngay sau khi sửa dữ liệu và chạy lại mỗi giờ (services/lichDongBo.js).
CREATE OR ALTER PROCEDURE sp_DongBoNhanVien
  @NhanVienId INT = NULL
AS
BEGIN
  SET NOCOUNT ON;
  DECLARE @homNay DATE = CAST(GETDATE() AS DATE);

  ;WITH Moi AS (
    SELECT q.NhanVienId, q.PhongBanId, q.ChucVuId, q.ChucDanhId,
           ROW_NUMBER() OVER (PARTITION BY q.NhanVienId ORDER BY q.NgayHieuLuc DESC, q.Id DESC) AS rn
    FROM QuaTrinhLamViec q
    WHERE q.DaXoa = 0 AND q.NgayHieuLuc <= @homNay AND (@NhanVienId IS NULL OR q.NhanVienId = @NhanVienId)
  )
  UPDATE nv
     SET nv.PhongBanId = m.PhongBanId,
         nv.ChucVuId   = m.ChucVuId,
         nv.ChucDanhId = COALESCE(m.ChucDanhId, nv.ChucDanhId)
  FROM NhanVien nv
  JOIN Moi m ON m.NhanVienId = nv.Id AND m.rn = 1
  WHERE nv.DaXoa = 0
    AND (ISNULL(nv.PhongBanId, 0) <> ISNULL(m.PhongBanId, 0)
         OR ISNULL(nv.ChucVuId, 0) <> ISNULL(m.ChucVuId, 0)
         OR ISNULL(nv.ChucDanhId, 0) <> ISNULL(COALESCE(m.ChucDanhId, nv.ChucDanhId), 0));

  UPDATE nv SET nv.DangLamViec = 0
  FROM NhanVien nv
  JOIN NghiViec n ON n.NhanVienId = nv.Id
  WHERE nv.DangLamViec = 1 AND n.NgayNghiViec <= @homNay AND (@NhanVienId IS NULL OR nv.Id = @NhanVienId);

  UPDATE tk SET tk.HoatDong = 0
  FROM TaiKhoan tk
  JOIN NghiViec n ON n.NhanVienId = tk.NhanVienId
  WHERE n.KhoaTaiKhoan = 1 AND n.NgayNghiViec <= @homNay AND tk.HoatDong = 1
    AND (@NhanVienId IS NULL OR tk.NhanVienId = @NhanVienId);

  UPDATE rt SET rt.DaThuHoi = 1
  FROM RefreshToken rt
  JOIN TaiKhoan tk ON tk.Id = rt.TaiKhoanId
  WHERE rt.DaThuHoi = 0 AND tk.HoatDong = 0 AND tk.NhanVienId IS NOT NULL
    AND (@NhanVienId IS NULL OR tk.NhanVienId = @NhanVienId);
END;
GO

-- ---------- Hợp đồng sắp hết hạn (chưa được gia hạn bằng hợp đồng khác) ----------
CREATE OR ALTER PROCEDURE sp_HopDongSapHetHan
  @SoNgay INT = 30
AS
BEGIN
  SET NOCOUNT ON;
  DECLARE @homNay DATE = CAST(GETDATE() AS DATE);
  SELECT h.Id, h.NhanVienId, nv.MaNhanVien, nv.HoTen, h.SoHopDong, lhd.Ten AS TenLoaiHopDong,
         CONVERT(VARCHAR(10), h.NgayKetThuc, 23) AS NgayKetThuc,
         DATEDIFF(DAY, @homNay, h.NgayKetThuc) AS ConLaiNgay
  FROM HopDong h
  JOIN NhanVien nv ON nv.Id = h.NhanVienId AND nv.DaXoa = 0 AND nv.DangLamViec = 1
  JOIN LoaiHopDong lhd ON lhd.Id = h.LoaiHopDongId
  WHERE h.DaXoa = 0 AND h.NgayKetThuc IS NOT NULL
    AND h.NgayKetThuc >= @homNay AND h.NgayKetThuc <= DATEADD(DAY, @SoNgay, @homNay)
    AND NOT EXISTS (SELECT 1 FROM HopDong h2 WHERE h2.NhanVienId = h.NhanVienId AND h2.DaXoa = 0 AND h2.NgayBatDau > h.NgayBatDau)
  ORDER BY h.NgayKetThuc, nv.HoTen;
END;
GO

PRINT 'Migration 005 hoàn tất.';
SET NOEXEC OFF;
