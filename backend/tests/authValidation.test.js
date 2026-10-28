const { DangNhapSchema } = require("../src/validation/auth");

describe("DangNhapSchema", () => {
  test("chấp nhận tên đăng nhập và mật khẩu", () => {
    expect(DangNhapSchema.safeParse({ tenDangNhap: "nhanvien", matKhau: "Matkhau123" }).success).toBe(true);
  });

  test("từ chối khi thiếu tên đăng nhập hoặc mật khẩu", () => {
    expect(DangNhapSchema.safeParse({ matKhau: "Matkhau123" }).success).toBe(false);
    expect(DangNhapSchema.safeParse({ tenDangNhap: "nhanvien" }).success).toBe(false);
  });
});
