const bcrypt = require("bcrypt");

async function damBaoTaiKhoanAdmin(pool) {
  const existing = await pool
    .request()
    .input("u", "admin")
    .query("SELECT Id, MatKhauMaHoa, Email FROM TaiKhoan WHERE TenDangNhap = @u");

  if (existing.recordset[0]?.MatKhauMaHoa) {
    if (!existing.recordset[0].Email && process.env.ADMIN_EMAIL) {
      await pool
        .request()
        .input("id", existing.recordset[0].Id)
        .input("email", process.env.ADMIN_EMAIL.trim().toLowerCase())
        .query("UPDATE TaiKhoan SET Email = @email WHERE Id = @id AND Email IS NULL");
    }
    return false;
  }

  const hash = await bcrypt.hash("admin", 10);
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase() || null;
  if (existing.recordset[0]) {
    await pool
      .request()
      .input("id", existing.recordset[0].Id)
      .input("hash", hash)
      .input("email", email)
      .query(
        "UPDATE TaiKhoan SET MatKhauMaHoa = @hash, Email = COALESCE(Email, @email) WHERE Id = @id",
      );
  } else {
    await pool
      .request()
      .input("hash", hash)
      .input("email", email)
      .query(
        `INSERT INTO TaiKhoan (TenDangNhap, Email, MatKhauMaHoa, VaiTro)
         VALUES ('admin', @email, @hash, 'admin')`,
      );
  }
  return true;
}

module.exports = { damBaoTaiKhoanAdmin };
