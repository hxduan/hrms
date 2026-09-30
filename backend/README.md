# HRMS Backend — Giai đoạn 1: Nền tảng (Auth + Hạ tầng)

## Đã có trong giai đoạn này

- Kết nối SQL Server (`src/db.js`)
- Schema CSDL đầy đủ, đúng thứ tự phụ thuộc (`db/schema.sql`)
- Đăng nhập tài khoản thường (bcrypt) + Google OAuth (Passport)
- Refresh token, Quên mật khẩu (gửi email qua Gmail)
- Middleware dùng chung: xác thực JWT, phân quyền, validate (Zod), xử lý lỗi
  tập trung, rate limit chống dò mật khẩu
- Nhật ký thay đổi (`src/services/nhatKy.js`) — sẵn sàng cho các Giai đoạn sau
- Ghi log (Winston + Morgan)
- Test tự động (Jest + Supertest) + CI (GitHub Actions, chỉ chạy test)

## Các bước chạy thử (thực hiện trên máy bạn)

1. **Khởi động SQL Server qua Docker**:

   ```bash
   docker run -e "ACCEPT_EULA=Y" -e "SA_PASSWORD=YourStr0ngPwd!" \
     -p 1433:1433 -d --name hrms-sql mcr.microsoft.com/mssql/server
   ```

2. **Tạo database và chạy schema**:

   ```sql
   CREATE DATABASE hrms;
   ```

   Sau đó chạy toàn bộ nội dung `db/schema.sql` trên database `hrms` (dùng
   Azure Data Studio / SSMS / `sqlcmd`). Vì file đã đúng thứ tự cha-con,
   chạy 1 lần từ đầu đến cuối sẽ không lỗi FK.

3. **Cấu hình môi trường**:

   ```bash
   cp .env.example .env
   ```

   Điền `DB_PASSWORD` khớp với bước 1. `GOOGLE_CLIENT_ID`/`SECRET` lấy từ
   Google Cloud Console (Authorized redirect URI:
   `http://localhost:3000/auth/google/callback`). `GMAIL_APP_PASSWORD` lấy
   từ myaccount.google.com/apppasswords.

4. **Cài đặt & khởi tạo dữ liệu mẫu**:

   ```bash
   pnpm install
   pnpm run seed     # tạo tài khoản admin/admin
   pnpm run dev
   ```

5. **Kiểm tra bằng Postman**:
   - `GET http://localhost:3000/health` → phải trả `{"status":"ok"}`
   - `POST http://localhost:3000/auth/login` body
     `{"tenDangNhap":"admin","matKhau":"admin"}` → phải trả về
     `accessToken` + `refreshToken`
   - Mở trình duyệt `http://localhost:3000/auth/google` → phải chuyển hướng
     sang màn hình chọn tài khoản Google

6. **Chạy test tự động**:
   ```bash
   pnpm test
   ```
   Lưu ý: test thứ 3 trong `tests/auth.test.js` cần đã chạy `pnpm run seed`
   trước, vì nó đăng nhập bằng tài khoản `admin` thật.

## Tiêu chí "đạt" để chuyển sang Giai đoạn 2 (Tổ chức)

- [ ] `db/schema.sql` chạy xong không lỗi trên DB rỗng
- [ ] `pnpm run seed` tạo được tài khoản admin
- [ ] Đăng nhập thường qua Postman trả về đúng 2 token
- [ ] Đăng nhập Google chuyển hướng và tạo được `TaiKhoan` mới (kiểm tra
      trong DB thấy `NhaCungCapOAuth = 'google'` và `MaNguoiDungOAuth` có giá trị)
- [ ] `pnpm test` chạy xanh cả 3 test

**Xác nhận đủ 5 tiêu chí trên rồi báo lại — tôi mới viết tiếp Giai đoạn 2
(Tổ chức: PhongBan/ChucVu/ChucDanh/Định biên), theo đúng yêu cầu "kiểm tra
từng tính năng trước khi tiến về phía trước".**
