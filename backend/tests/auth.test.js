const request = require("supertest");
const app = require("../src/app");

describe("API khôi phục mật khẩu", () => {
  test.each(["/auth/quen-mat-khau", "/auth/dat-lai-mat-khau"])(
    "từ chối dữ liệu không hợp lệ cho POST %s",
    async (endpoint) => {
      const res = await request(app).post(endpoint).send({});
      expect(res.status).toBe(400);
    },
  );
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
