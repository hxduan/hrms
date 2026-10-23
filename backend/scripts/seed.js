require("dotenv").config();
const { getPool } = require("../src/db");
const { damBaoTaiKhoanAdmin } = require("../src/services/adminSeed");

async function seed() {
  const pool = await getPool();
  const daTao = await damBaoTaiKhoanAdmin(pool);
  console.log(
    daTao
      ? "Đã khởi tạo tài khoản kiểm thử: admin / admin"
      : "Tài khoản admin đã tồn tại, giữ nguyên mật khẩu hiện tại.",
  );
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed thất bại:", err);
    process.exit(1);
  });
