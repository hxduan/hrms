-- ============================================================
-- MIGRATION 003 — Giai đoạn 2.1: phân quyền luồng tài khoản + bỏ ảnh đại diện
-- Chạy SAU 002. An toàn khi chạy lại nhiều lần.
-- ============================================================

IF COL_LENGTH('TaiKhoan', 'Email') IS NULL OR OBJECT_ID('NhanVien', 'U') IS NULL
BEGIN
  RAISERROR(N'Chưa chạy migration 002 (hoặc chưa có schema Giai đoạn 1). Hãy chạy 002_giai_doan_2.sql trước.', 16, 1);
  SET NOEXEC ON;
END
GO

-- Mật khẩu TẠM do admin/HR đặt: buộc đổi ở lần đăng nhập kế tiếp.
IF COL_LENGTH('TaiKhoan', 'BatDoiMatKhau') IS NULL
  ALTER TABLE TaiKhoan ADD BatDoiMatKhau BIT NOT NULL CONSTRAINT DF_TaiKhoan_BatDoiMatKhau DEFAULT 0;
GO

-- Khóa / mở khóa tài khoản (VD nhân viên nghỉ việc) mà không xóa dữ liệu.
IF COL_LENGTH('TaiKhoan', 'HoatDong') IS NULL
  ALTER TABLE TaiKhoan ADD HoatDong BIT NOT NULL CONSTRAINT DF_TaiKhoan_HoatDong DEFAULT 1;
GO

-- Bỏ ảnh đại diện (không dùng Cloudinary nữa). Giao diện dùng chữ cái đầu của tên làm avatar.
IF COL_LENGTH('NhanVien', 'AnhDaiDienUrl') IS NOT NULL
  ALTER TABLE NhanVien DROP COLUMN AnhDaiDienUrl;
GO

PRINT 'Migration 003 hoàn tất.';
SET NOEXEC OFF;
