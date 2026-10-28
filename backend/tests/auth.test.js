const request = require("supertest");
const app = require("../src/app");

describe("Các luồng xác thực công khai", () => {
  test.each(["/auth/tu-dang-ky", "/auth/quen-mat-khau"])(
    "đã gỡ POST %s",
    async (endpoint) => {
      const res = await request(app).post(endpoint).send({});
      expect(res.status).toBe(404);
    },
  );

  test("từ chối mã khôi phục không hợp lệ", async () => {
    const res = await request(app).post("/auth/dat-lai-mat-khau").send({});
    expect(res.status).toBe(400);
  });
});

describe("POST /auth/login", () => {
  test("trả về 401 khi sai mật khẩu", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ tenDangNhap: "__hrms_invalid_login__", matKhau: "InvalidPass123!" });
    expect(res.status).toBe(401);
  });

  test("trả về 400 khi thiếu tenDangNhap", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ matKhau: "12345" });
    expect(res.status).toBe(400);
  });

  const loginCoCauHinh =
    process.env.HRMS_TEST_LOGIN_USERNAME && process.env.HRMS_TEST_LOGIN_PASSWORD;

  (loginCoCauHinh ? test : test.skip)("đăng nhập đúng trả về accessToken", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({
        tenDangNhap: process.env.HRMS_TEST_LOGIN_USERNAME,
        matKhau: process.env.HRMS_TEST_LOGIN_PASSWORD,
      });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
  });
});
