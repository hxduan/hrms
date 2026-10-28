const { TuDangKySchema } = require("../src/validation/taiKhoan");

describe("TuDangKySchema", () => {
  test("chuẩn hóa tên đăng nhập và email", () => {
    expect(
      TuDangKySchema.parse({
        tenDangNhap: "  Nhan_Vien ",
        email: " NhanVien@Gmail.com ",
        matKhau: "mat-khau-an-toan1",
      }),
    ).toMatchObject({
      tenDangNhap: "Nhan_Vien",
      email: "nhanvien@gmail.com",
    });
  });

  test("từ chối mật khẩu không đáp ứng chính sách", () => {
    expect(
      TuDangKySchema.safeParse({
        tenDangNhap: "nhanvien",
        email: "nhanvien@example.com",
        matKhau: "yeu",
      }).success,
    ).toBe(false);
  });

  test("không cho phép người dùng tự chọn vai trò", () => {
    const duLieu = TuDangKySchema.parse({
      tenDangNhap: "nhanvien",
      email: "nhanvien@example.com",
      matKhau: "Matkhau123",
      vaiTro: "admin",
    });
    expect(duLieu).not.toHaveProperty("vaiTro");
  });
});
