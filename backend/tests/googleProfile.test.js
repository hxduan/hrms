// Test thuần cho logic lấy thông tin Google + quyết định đồng bộ
// Không cần kết nối SQL Server (db.js chỉ kết nối lười khi gọi getPool()).
const { layThongTuGoogle, tinhThongTinCanDongBo } = require("../src/config/passport");

function taoProfile(overrides = {}) {
  return {
    id: "112233445566778899000",
    displayName: "Nguyễn Văn A",
    emails: [{ value: "nguyenvana@gmail.com", verified: true }],
    ...overrides,
  };
}

describe("layThongTuGoogle", () => {
  test("lấy email làm TenDangNhap và Email", () => {
    expect(layThongTuGoogle(taoProfile())).toEqual({
      email: "nguyenvana@gmail.com",
      tenDangNhap: "nguyenvana@gmail.com",
    });
  });

  test("không có email thì không dùng displayName làm tên đăng nhập", () => {
    expect(layThongTuGoogle(taoProfile({ emails: [] }))).toEqual({
      email: null,
      tenDangNhap: null,
    });
  });

  test("không có email lẫn displayName -> cả hai null", () => {
    expect(
      layThongTuGoogle(taoProfile({ emails: [], displayName: "   " })),
    ).toEqual({ email: null, tenDangNhap: null });
  });

  test("chuẩn hóa email thành chữ thường", () => {
    expect(
      layThongTuGoogle(taoProfile({ emails: [{ value: "A@GMAIL.COM" }] })),
    ).toEqual({ email: "a@gmail.com", tenDangNhap: "a@gmail.com" });
  });

  test("email dài quá giới hạn username thì không thay bằng displayName", () => {
    const daiQua = `${"a".repeat(255)}@gmail.com`;
    expect(layThongTuGoogle(taoProfile({ emails: [{ value: daiQua }] }))).toEqual({
      email: daiQua,
      tenDangNhap: null,
    });
  });

  test("email dài quá giới hạn username và không có displayName -> TenDangNhap null", () => {
    const daiQua = `${"a".repeat(255)}@gmail.com`;
    expect(
      layThongTuGoogle(taoProfile({ emails: [{ value: daiQua }], displayName: "" })),
    ).toEqual({ email: daiQua, tenDangNhap: null });
  });

  test("bỏ khoảng trắng thừa quanh email", () => {
    expect(
      layThongTuGoogle(taoProfile({ emails: [{ value: "  a@b.com  " }] })).email,
    ).toBe("a@b.com");
  });
});

describe("tinhThongTinCanDongBo", () => {
  const profile = taoProfile();

  test("Email/TenDangNhap đang NULL -> điền vào", () => {
    const kq = tinhThongTinCanDongBo(profile, { Email: null, TenDangNhap: null });
    expect(kq.canDongBoEmail).toBe(true);
    expect(kq.canDongBoTen).toBe(true);
  });

  test("trên Google đã đổi email -> đồng bộ theo Google", () => {
    const kq = tinhThongTinCanDongBo(profile, {
      Email: "cu@gmail.com",
      TenDangNhap: "cu@gmail.com",
    });
    expect(kq.canDongBoEmail).toBe(true);
    expect(kq.canDongBoTen).toBe(true);
  });

  test("khớp hoàn toàn -> không UPDATE thừa", () => {
    const kq = tinhThongTinCanDongBo(profile, {
      Email: "nguyenvana@gmail.com",
      TenDangNhap: "nguyenvana@gmail.com",
    });
    expect(kq.canDongBoEmail).toBe(false);
    expect(kq.canDongBoTen).toBe(false);
  });

  test("chỉ email khác, TenDangNhap đã khớp -> chỉ đồng bộ Email", () => {
    const kq = tinhThongTinCanDongBo(profile, {
      Email: "khac@gmail.com",
      TenDangNhap: "nguyenvana@gmail.com",
    });
    expect(kq.canDongBoEmail).toBe(true);
    expect(kq.canDongBoTen).toBe(false);
  });

  test("profile không có email -> không đồng bộ Email hoặc TenDangNhap", () => {
    const kq = tinhThongTinCanDongBo(taoProfile({ emails: [] }), {
      Email: null,
      TenDangNhap: null,
    });
    expect(kq.canDongBoEmail).toBe(false);
    expect(kq.canDongBoTen).toBe(false);
    expect(kq.tenDangNhap).toBeNull();
  });

  test("Tài khoản không có trường Email/TenDangNhap (dòng chưa đủ cột) không ném lỗi", () => {
    expect(() => tinhThongTinCanDongBo(profile, {})).not.toThrow();
    expect(tinhThongTinCanDongBo(profile, {}).canDongBoEmail).toBe(true);
  });
});
