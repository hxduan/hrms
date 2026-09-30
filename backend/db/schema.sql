-- ============================================================
-- HRMS — Script CSDL tổng hợp, ĐÚNG THỨ TỰ CHA-CON
-- Chạy toàn bộ file này 1 lần trên database rỗng (CREATE DATABASE hrms; USE hrms;)
-- Nguyên tắc: bảng cha (không phụ thuộc ai, hoặc chỉ tự tham chiếu) luôn
-- đứng TRƯỚC bảng con (có FK trỏ tới bảng khác) trong chính file này.
-- ============================================================

-- ===== NHÓM 1: Bảng gốc, không phụ thuộc bảng nghiệp vụ nào khác =====

CREATE TABLE TaiKhoan (
  Id INT IDENTITY PRIMARY KEY,
  TenDangNhap NVARCHAR(100) UNIQUE NULL,
  MatKhau NVARCHAR(255) NULL,
  VaiTro NVARCHAR(20) NOT NULL DEFAULT 'nhan_vien'
         CHECK (VaiTro IN ('admin','hr','nhan_vien')),
  NhaCungCapOAuth NVARCHAR(20) NULL CHECK (NhaCungCapOAuth IN ('google') OR NhaCungCapOAuth IS NULL),
  MaNguoiDungOAuth NVARCHAR(255) NULL,
  MaKhoiPhucMatKhau NVARCHAR(100) NULL,
  HanKhoiPhuc DATETIME NULL,
  NhanVienId INT NULL, -- FK thật thêm bằng ALTER ở cuối file, sau khi có bảng NhanVien (phá vòng lặp phụ thuộc)
  NgayTao DATETIME DEFAULT GETDATE(),
  CONSTRAINT UQ_TaiKhoan_OAuth UNIQUE (NhaCungCapOAuth, MaNguoiDungOAuth)
);

CREATE TABLE PhongBan (
  Id INT IDENTITY PRIMARY KEY,
  Ten NVARCHAR(200) NOT NULL,
  PhongBanChaId INT NULL REFERENCES PhongBan(Id), -- tự tham chiếu, hợp lệ ngay trong bảng gốc
  DaXoa BIT NOT NULL DEFAULT 0
);

CREATE TABLE ChucDanh (
  Id INT IDENTITY PRIMARY KEY,
  Ten NVARCHAR(200) NOT NULL,
  DaXoa BIT NOT NULL DEFAULT 0
);

CREATE TABLE LoaiHopDong (
  Id INT IDENTITY PRIMARY KEY,
  Ten NVARCHAR(100) NOT NULL,
  DaXoa BIT NOT NULL DEFAULT 0
);

CREATE TABLE LyDoNghiViec (
  Id INT IDENTITY PRIMARY KEY,
  Ten NVARCHAR(200) NOT NULL,
  DaXoa BIT NOT NULL DEFAULT 0
);

CREATE TABLE NgayLe (
  Id INT IDENTITY PRIMARY KEY,
  Ngay DATE NOT NULL,
  Ten NVARCHAR(200)
);

CREATE TABLE CaLamViec (
  Id INT IDENTITY PRIMARY KEY,
  Ten NVARCHAR(100) NOT NULL,
  LoaiCa NVARCHAR(20) NOT NULL CHECK (LoaiCa IN ('nua_ngay_sang','nua_ngay_chieu','ca_ngay')),
  GioBatDau TIME NOT NULL,
  GioKetThuc TIME NOT NULL,
  GioNghiTruaBatDau TIME NULL,
  GioNghiTruaKetThuc TIME NULL,
  DaXoa BIT NOT NULL DEFAULT 0,
  CONSTRAINT CK_CaLamViec_NghiTrua CHECK (
    (LoaiCa = 'ca_ngay' AND GioNghiTruaBatDau IS NOT NULL AND GioNghiTruaKetThuc IS NOT NULL)
    OR (LoaiCa <> 'ca_ngay' AND GioNghiTruaBatDau IS NULL)
  )
);

CREATE TABLE ThamSoLuongTheoNam (
  Id INT IDENTITY PRIMARY KEY,
  NgayHieuLuc DATE NOT NULL,
  TyLeBHXH DECIMAL(5,2) NOT NULL,
  GiamTruBanThan DECIMAL(18,2) NOT NULL,
  GiamTruNguoiPhuThuoc DECIMAL(18,2) NOT NULL,
  BacThueJson NVARCHAR(MAX) NOT NULL
);

CREATE TABLE CongChuanThang (
  Id INT IDENTITY PRIMARY KEY,
  Thang INT NOT NULL,
  Nam INT NOT NULL,
  SoNgayCongChuan DECIMAL(4,1) NOT NULL,
  CONSTRAINT UQ_CongChuanThang UNIQUE (Thang, Nam)
);

-- ===== NHÓM 2: Phụ thuộc NHÓM 1 =====

CREATE TABLE ChucVu (
  Id INT IDENTITY PRIMARY KEY,
  Ten NVARCHAR(200) NOT NULL,
  PhongBanId INT NULL REFERENCES PhongBan(Id),
  DaXoa BIT NOT NULL DEFAULT 0
);

CREATE TABLE DinhBienViTri (
  Id INT IDENTITY PRIMARY KEY,
  PhongBanId INT NOT NULL REFERENCES PhongBan(Id),
  ChucDanhId INT NOT NULL REFERENCES ChucDanh(Id),
  Nam INT NOT NULL,
  SoLuongDuocDuyet INT NOT NULL CHECK (SoLuongDuocDuyet >= 0),
  GhiChu NVARCHAR(300),
  CONSTRAINT UQ_DinhBien UNIQUE (PhongBanId, ChucDanhId, Nam)
);

-- ===== NHÓM 3: NhanVien — bảng trung tâm, phụ thuộc PhongBan/ChucVu/ChucDanh =====

CREATE TABLE NhanVien (
  Id INT IDENTITY PRIMARY KEY,
  MaNhanVien NVARCHAR(20) NULL UNIQUE,
  HoTen NVARCHAR(200) NOT NULL,
  NgaySinh DATE,
  GioiTinh NVARCHAR(10),
  SoCCCD NVARCHAR(20) UNIQUE,
  SoDienThoai NVARCHAR(20),
  Tinh NVARCHAR(100),
  QuanHuyen NVARCHAR(100),
  DiaChiChiTiet NVARCHAR(300),
  AnhDaiDienUrl NVARCHAR(500),
  PhongBanId INT REFERENCES PhongBan(Id),
  ChucVuId INT REFERENCES ChucVu(Id),
  ChucDanhId INT REFERENCES ChucDanh(Id),
  TenNganHang NVARCHAR(200) NULL,
  SoTaiKhoanNganHang NVARCHAR(50) NULL,
  DangLamViec BIT NOT NULL DEFAULT 1,
  DaXoa BIT NOT NULL DEFAULT 0
);

-- Phá vòng lặp phụ thuộc TaiKhoan <-> NhanVien: thêm FK ở đây, sau khi cả 2 đã tồn tại
ALTER TABLE TaiKhoan ADD CONSTRAINT FK_TaiKhoan_NhanVien FOREIGN KEY (NhanVienId) REFERENCES NhanVien(Id);
ALTER TABLE TaiKhoan ADD CONSTRAINT UQ_TaiKhoan_NhanVien UNIQUE (NhanVienId);

-- ===== NHÓM 4: Phụ thuộc NhanVien =====

CREATE TABLE HopDong (
  Id INT IDENTITY PRIMARY KEY,
  NhanVienId INT NOT NULL REFERENCES NhanVien(Id),
  LoaiHopDongId INT NOT NULL REFERENCES LoaiHopDong(Id),
  NgayBatDau DATE NOT NULL,
  NgayKetThuc DATE NULL,
  LuongCoBan DECIMAL(18,2)
);

CREATE TABLE QuaTrinhLamViec (
  Id INT IDENTITY PRIMARY KEY,
  NhanVienId INT NOT NULL REFERENCES NhanVien(Id),
  PhongBanId INT REFERENCES PhongBan(Id),
  ChucVuId INT REFERENCES ChucVu(Id),
  NgayHieuLuc DATE NOT NULL,
  GhiChu NVARCHAR(300)
);

CREATE TABLE NghiViec (
  Id INT IDENTITY PRIMARY KEY,
  NhanVienId INT NOT NULL UNIQUE REFERENCES NhanVien(Id),
  LyDoNghiViecId INT REFERENCES LyDoNghiViec(Id),
  NgayNghiViec DATE NOT NULL,
  GhiChu NVARCHAR(300)
);

CREATE TABLE PhanCa (
  Id INT IDENTITY PRIMARY KEY,
  NhanVienId INT NOT NULL REFERENCES NhanVien(Id),
  CaLamViecId INT NOT NULL REFERENCES CaLamViec(Id),
  NgayHieuLuc DATE NOT NULL
);

CREATE TABLE ChamCongTho (
  Id BIGINT IDENTITY PRIMARY KEY,
  NhanVienId INT NOT NULL REFERENCES NhanVien(Id),
  ThoiDiemQuet DATETIME NOT NULL
);
CREATE INDEX IX_ChamCongTho_NhanVienNgay ON ChamCongTho (NhanVienId, ThoiDiemQuet);

CREATE TABLE BangCongTongHop (
  Id BIGINT IDENTITY PRIMARY KEY,
  NhanVienId INT NOT NULL REFERENCES NhanVien(Id),
  Ngay DATE NOT NULL,
  TrangThaiCong NVARCHAR(20) NOT NULL
      CHECK (TrangThaiCong IN ('di_lam','nghi_phep','nghi_le','vang_khong_phep')),
  GioVaoSom DATETIME NULL,
  GioRaMuon DATETIME NULL,
  SoGioThucTe DECIMAL(5,2),
  HeSoCong DECIMAL(3,2) NOT NULL DEFAULT 1.0,
  DaKhoa BIT NOT NULL DEFAULT 0,
  CONSTRAINT UQ_BangCong UNIQUE (NhanVienId, Ngay)
);

CREATE TABLE PhuCapNhanVien (
  Id INT IDENTITY PRIMARY KEY,
  NhanVienId INT NOT NULL REFERENCES NhanVien(Id),
  TenPhuCap NVARCHAR(200) NOT NULL,
  SoTien DECIMAL(18,2) NOT NULL,
  TinhBHXH BIT NOT NULL DEFAULT 0,
  TinhThue BIT NOT NULL DEFAULT 1,
  NgayHieuLuc DATE NOT NULL,
  NgayKetThuc DATE NULL
);

CREATE TABLE NguoiPhuThuocNhanVien (
  Id INT IDENTITY PRIMARY KEY,
  NhanVienId INT NOT NULL REFERENCES NhanVien(Id),
  HoTen NVARCHAR(200) NOT NULL,
  NgayBatDauTinhGiamTru DATE NOT NULL,
  NgayKetThucTinhGiamTru DATE NULL
);

-- ===== NHÓM 5: Đơn từ — phụ thuộc NhanVien + TaiKhoan =====

CREATE TABLE DonNghiPhep (
  Id INT IDENTITY PRIMARY KEY,
  NhanVienId INT NOT NULL REFERENCES NhanVien(Id),
  LoaiNghiPhep NVARCHAR(50),
  NgayBatDau DATE NOT NULL,
  NgayKetThuc DATE NOT NULL,
  TrangThai NVARCHAR(20) NOT NULL DEFAULT 'cho_duyet'
             CHECK (TrangThai IN ('cho_duyet','da_duyet','tu_choi')),
  NguoiDuyetId INT NULL REFERENCES TaiKhoan(Id)
);

CREATE TABLE DonLamThemGio (
  Id INT IDENTITY PRIMARY KEY,
  NhanVienId INT NOT NULL REFERENCES NhanVien(Id),
  Ngay DATE NOT NULL,
  SoGio DECIMAL(4,2) NOT NULL,
  TrangThai NVARCHAR(20) NOT NULL DEFAULT 'cho_duyet'
             CHECK (TrangThai IN ('cho_duyet','da_duyet','tu_choi')),
  NguoiDuyetId INT NULL REFERENCES TaiKhoan(Id)
);

CREATE TABLE DonCongTac (
  Id INT IDENTITY PRIMARY KEY,
  NhanVienId INT NOT NULL REFERENCES NhanVien(Id),
  NgayBatDau DATE NOT NULL,
  NgayKetThuc DATE NOT NULL,
  MucDich NVARCHAR(300),
  TrangThai NVARCHAR(20) NOT NULL DEFAULT 'cho_duyet'
             CHECK (TrangThai IN ('cho_duyet','da_duyet','tu_choi')),
  NguoiDuyetId INT NULL REFERENCES TaiKhoan(Id)
);

-- ===== NHÓM 6: Lương — phụ thuộc NhanVien, TaiKhoan =====

CREATE TABLE DienBienLuong (
  Id INT IDENTITY PRIMARY KEY,
  NhanVienId INT NOT NULL REFERENCES NhanVien(Id),
  Thang INT NOT NULL,
  Nam INT NOT NULL,
  NgayTinh DATETIME NOT NULL DEFAULT GETDATE(),
  TrangThai NVARCHAR(20) NOT NULL DEFAULT 'nhap'
      CHECK (TrangThai IN ('nhap','cho_duyet','da_duyet','tu_choi','da_tra')),
  TongThucLinh DECIMAL(18,2) NOT NULL DEFAULT 0,
  NguoiDuyetId INT NULL REFERENCES TaiKhoan(Id),
  ThoiGianDuyet DATETIME NULL,
  LyDoTuChoi NVARCHAR(MAX) NULL,
  CONSTRAINT UQ_DienBienLuong UNIQUE (NhanVienId, Thang, Nam)
);

-- ===== NHÓM 7: Phụ thuộc DienBienLuong =====

CREATE TABLE DienBienLuong_ChiTiet (
  Id INT IDENTITY PRIMARY KEY,
  DienBienLuongId INT NOT NULL REFERENCES DienBienLuong(Id),
  LoaiKhoan NVARCHAR(30) NOT NULL CHECK (LoaiKhoan IN
    ('ngay_cong','luong_theo_cong','phu_cap','bhxh','thue_tncn')),
  TenKhoan NVARCHAR(200) NOT NULL,
  GiaTri DECIMAL(18,2) NOT NULL,
  LoaiTacDong NVARCHAR(10) NOT NULL CHECK (LoaiTacDong IN ('cong','tru','thong_tin'))
);

CREATE TABLE DieuChinhLuong (
  Id INT IDENTITY PRIMARY KEY,
  DienBienLuongId INT NOT NULL REFERENCES DienBienLuong(Id),
  NguoiDeXuatId INT NOT NULL REFERENCES TaiKhoan(Id),
  NoiDungDeXuat NVARCHAR(MAX) NOT NULL,
  LyDoGiaiTrinh NVARCHAR(MAX) NOT NULL,
  TrangThai NVARCHAR(20) NOT NULL DEFAULT 'cho_duyet'
             CHECK (TrangThai IN ('cho_duyet','da_duyet','tu_choi')),
  NguoiDuyetId INT NULL REFERENCES TaiKhoan(Id),
  LyDoTuChoi NVARCHAR(MAX) NULL,
  ThoiGianTao DATETIME DEFAULT GETDATE(),
  ThoiGianDuyet DATETIME NULL
);

-- ===== NHÓM 8: Hệ thống — phụ thuộc TaiKhoan =====

CREATE TABLE NhatKyThayDoi (
  Id BIGINT IDENTITY PRIMARY KEY,
  TenBang NVARCHAR(100) NOT NULL,
  BanGhiId INT NOT NULL,
  TenCot NVARCHAR(100) NOT NULL,
  GiaTriCu NVARCHAR(MAX),
  GiaTriMoi NVARCHAR(MAX),
  NguoiThucHienId INT NOT NULL REFERENCES TaiKhoan(Id),
  ThoiGian DATETIME NOT NULL DEFAULT GETDATE()
);
CREATE INDEX IX_NhatKy_BangVaBanGhi ON NhatKyThayDoi (TenBang, BanGhiId);

CREATE TABLE RefreshToken (
  Id INT IDENTITY PRIMARY KEY,
  TaiKhoanId INT NOT NULL REFERENCES TaiKhoan(Id),
  Token NVARCHAR(255) UNIQUE NOT NULL,
  HetHan DATETIME NOT NULL,
  DaThuHoi BIT NOT NULL DEFAULT 0
);

-- ============================================================
-- VIEW & FUNCTION tra cứu
-- ============================================================
GO
CREATE VIEW View_TinhTrangDinhBien AS
SELECT
  db.Id AS DinhBienId, db.PhongBanId, db.ChucDanhId, db.Nam,
  db.SoLuongDuocDuyet,
  COUNT(nv.Id) AS SoLuongDangGiu,
  db.SoLuongDuocDuyet - COUNT(nv.Id) AS ConLai
FROM DinhBienViTri db
LEFT JOIN NhanVien nv
  ON nv.PhongBanId = db.PhongBanId AND nv.ChucDanhId = db.ChucDanhId
  AND nv.DangLamViec = 1 AND nv.DaXoa = 0
GROUP BY db.Id, db.PhongBanId, db.ChucDanhId, db.Nam, db.SoLuongDuocDuyet;
GO

CREATE FUNCTION fn_ThamSoLuongHieuLuc (@Ngay DATE)
RETURNS INT
AS
BEGIN
  DECLARE @Id INT;
  SELECT TOP 1 @Id = Id FROM ThamSoLuongTheoNam
  WHERE NgayHieuLuc <= @Ngay ORDER BY NgayHieuLuc DESC;
  RETURN @Id;
END;
GO

CREATE PROCEDURE sp_TongHopCongNgay
  @NhanVienId INT, @Ngay DATE
AS
BEGIN
  DECLARE @GioVaoSom DATETIME, @GioRaMuon DATETIME, @SoGioThucTe DECIMAL(5,2);

  SELECT @GioVaoSom = MIN(ThoiDiemQuet), @GioRaMuon = MAX(ThoiDiemQuet)
  FROM ChamCongTho
  WHERE NhanVienId = @NhanVienId AND CAST(ThoiDiemQuet AS DATE) = @Ngay;

  IF @GioVaoSom IS NULL
  BEGIN
    INSERT INTO BangCongTongHop (NhanVienId, Ngay, TrangThaiCong, SoGioThucTe, HeSoCong)
    VALUES (@NhanVienId, @Ngay, 'vang_khong_phep', 0, 0);
    RETURN;
  END

  DECLARE @LoaiCa NVARCHAR(20), @NghiTruaBD TIME, @NghiTruaKT TIME;
  SELECT TOP 1 @LoaiCa = cl.LoaiCa,
         @NghiTruaBD = cl.GioNghiTruaBatDau, @NghiTruaKT = cl.GioNghiTruaKetThuc
  FROM PhanCa pc
  JOIN CaLamViec cl ON cl.Id = pc.CaLamViecId
  WHERE pc.NhanVienId = @NhanVienId AND pc.NgayHieuLuc <= @Ngay
  ORDER BY pc.NgayHieuLuc DESC;

  SET @SoGioThucTe = DATEDIFF(MINUTE, @GioVaoSom, @GioRaMuon) / 60.0;

  IF @LoaiCa = 'ca_ngay' AND @NghiTruaBD IS NOT NULL
     AND CAST(@GioVaoSom AS TIME) <= @NghiTruaBD
     AND CAST(@GioRaMuon AS TIME) >= @NghiTruaKT
  BEGIN
    SET @SoGioThucTe = @SoGioThucTe - DATEDIFF(MINUTE, @NghiTruaBD, @NghiTruaKT) / 60.0;
  END

  INSERT INTO BangCongTongHop (NhanVienId, Ngay, TrangThaiCong, GioVaoSom, GioRaMuon, SoGioThucTe, HeSoCong)
  VALUES (@NhanVienId, @Ngay, 'di_lam', @GioVaoSom, @GioRaMuon, @SoGioThucTe,
          CASE WHEN @LoaiCa = 'ca_ngay' THEN 1.0 ELSE 0.5 END);
END;
GO

CREATE PROCEDURE sp_LayThongTinTongQuanNhanVien
  @NhanVienId INT
AS
BEGIN
  SELECT nv.*, pb.Ten AS TenPhongBan, cv.Ten AS TenChucVu, cd.Ten AS TenChucDanh,
         hd.LoaiHopDongId, lhd.Ten AS TenLoaiHopDong, hd.NgayBatDau AS NgayBatDauHopDong
  FROM NhanVien nv
  LEFT JOIN PhongBan pb ON pb.Id = nv.PhongBanId
  LEFT JOIN ChucVu cv ON cv.Id = nv.ChucVuId
  LEFT JOIN ChucDanh cd ON cd.Id = nv.ChucDanhId
  LEFT JOIN HopDong hd ON hd.NhanVienId = nv.Id AND hd.NgayKetThuc IS NULL
  LEFT JOIN LoaiHopDong lhd ON lhd.Id = hd.LoaiHopDongId
  WHERE nv.Id = @NhanVienId AND nv.DaXoa = 0;
END;
GO

CREATE PROCEDURE sp_LayChiTietDienBienLuong
  @DienBienLuongId INT
AS
BEGIN
  SELECT db.Id, db.Thang, db.Nam, db.TongThucLinh, db.TrangThai,
         nv.HoTen, nv.MaNhanVien
  FROM DienBienLuong db JOIN NhanVien nv ON nv.Id = db.NhanVienId
  WHERE db.Id = @DienBienLuongId;

  SELECT LoaiKhoan, TenKhoan, GiaTri, LoaiTacDong
  FROM DienBienLuong_ChiTiet
  WHERE DienBienLuongId = @DienBienLuongId
  ORDER BY CASE LoaiTacDong WHEN 'thong_tin' THEN 0 WHEN 'cong' THEN 1 ELSE 2 END;
END;
GO

PRINT 'Schema đã tạo xong, đúng thứ tự phụ thuộc, không lỗi FK.';
