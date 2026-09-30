const request = require("supertest");
const app = require("../src/app");

describe("POST /auth/login", () => {
  test("trả về 401 khi sai mật khẩu", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ tenDangNhap: "admin", matKhau: "sai-mat-khau-chac-chan-sai" });
    expect(res.status).toBe(401);
  });

  test("trả về 400 khi thiếu tenDangNhap", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ matKhau: "12345" });
    expect(res.status).toBe(400);
  });

  test("đăng nhập đúng trả về accessToken (cần đã chạy seed trước)", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ tenDangNhap: "admin", matKhau: "admin" });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
  });
});
