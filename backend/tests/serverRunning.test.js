const http = require("http");
const { kiemTraServerHRMS } = require("../src/services/serverRunning");

describe("kiemTraServerHRMS", () => {
  let server;

  async function batServer(handler) {
    server = http.createServer(handler);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    return server.address().port;
  }

  afterEach(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
      server = null;
    }
  });

  test("nhận diện API HRMS đang chạy qua health check", async () => {
    const port = await batServer((_req, res) => {
      res.writeHead(200, {
        "content-type": "application/json",
        "x-hrms-service": "hrms",
      });
      res.end(JSON.stringify({ status: "ok" }));
    });

    await expect(kiemTraServerHRMS(port)).resolves.toBe(true);
  });

  test("không coi ứng dụng khác đang dùng cổng là API HRMS", async () => {
    const port = await batServer((_req, res) => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ status: "ok", service: "other" }));
    });

    await expect(kiemTraServerHRMS(port)).resolves.toBe(false);
  });

  test("nhận diện bản HRMS đang chạy trước khi có header nhận diện", async () => {
    const port = await batServer((req, res) => {
      res.setHeader("content-type", "application/json");
      if (req.url === "/health") {
        res.end(JSON.stringify({ status: "ok" }));
      } else {
        res.writeHead(401);
        res.end(JSON.stringify({ message: "Chưa đăng nhập" }));
      }
    });

    await expect(kiemTraServerHRMS(port)).resolves.toBe(true);
  });

  test("trả về false khi không có server lắng nghe", async () => {
    const closedServer = http.createServer();
    await new Promise((resolve) => closedServer.listen(0, "127.0.0.1", resolve));
    const { port } = closedServer.address();
    await new Promise((resolve) => closedServer.close(resolve));

    await expect(kiemTraServerHRMS(port)).resolves.toBe(false);
  });
});
