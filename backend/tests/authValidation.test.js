const { DangKySchema, QuenMatKhauSchema } = require("../src/validation/auth");

describe("DangKySchema", () => {
  test("chuẩn hóa tên đăng nhập email về chữ thường", () => {
    expect(
      DangKySchema.parse({
        tenDangNhap: "  NhanVien@Gmail.com ",
        matKhau: "mat-khau-an-toan",
        hoTen: "Nhân viên",
      }).tenDangNhap,
    ).toBe("nhanvien@gmail.com");
  });

  describe("QuenMatKhauSchema", () => {
    test("chỉ cần email và chuẩn hóa chữ thường", () => {
      expect(QuenMatKhauSchema.parse({ email: "  NhanVien@Gmail.com " })).toEqual({
        email: "nhanvien@gmail.com",
      });
    });

    test("từ chối email không hợp lệ", () => {
      expect(QuenMatKhauSchema.safeParse({ email: "khong-phai-email" }).success).toBe(
        false,
      );
    });
  });

  test("từ chối tên đăng nhập không phải email", () => {
    expect(
      DangKySchema.safeParse({
        tenDangNhap: "nhanvien",
        matKhau: "mat-khau-an-toan",
        hoTen: "Nhân viên",
      }).success,
    ).toBe(false);
  });

  test("yêu cầu họ tên nếu chưa cung cấp NhanVienId", () => {
    expect(
      DangKySchema.safeParse({
        tenDangNhap: "nhanvien@gmail.com",
        matKhau: "mat-khau-an-toan",
      }).success,
    ).toBe(false);
  });

  test("cho phép liên kết nhân viên đã có mà không cần nhập họ tên", () => {
    expect(
      DangKySchema.safeParse({
        tenDangNhap: "nhanvien@gmail.com",
        matKhau: "mat-khau-an-toan",
        nhanVienId: 12,
      }).success,
    ).toBe(true);
  });
});
