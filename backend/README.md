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

Chạy các lệnh bên dưới từ thư mục gốc của repository.

1. **Cấu hình môi trường và khởi động SQL Server qua Docker**:

   ```powershell
   # Chỉ tạo file nếu bạn chưa có backend/.env; không ghi đè file .env hiện có.
   if (-not (Test-Path backend\.env)) { Copy-Item backend\.env.example backend\.env }
   ```

   Trước khi khởi động SQL Server, mở `backend/.env` và đặt `DB_PASSWORD`
   thành mật khẩu mạnh, đồng thời thay `JWT_SECRET` bằng một chuỗi bí mật
   ngẫu nhiên. Docker Compose và backend sẽ dùng cùng `DB_PASSWORD`.
   `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` và thông tin Gmail chỉ cần điền
   nếu sử dụng các tính năng tương ứng. Docker Desktop phải đang chạy.

   ```powershell
   docker compose --env-file backend/.env up -d sql-server
   ```

2. **Tạo database và chạy schema**:

   ```sql
   CREATE DATABASE nhan_su;
   ```

   Tên database phải khớp với `DB_NAME` trong `backend/.env` (mặc định là
   `nhan_su`). Sau đó chạy toàn bộ nội dung `backend/db/schema.sql` trên
   database đó (dùng Azure Data Studio / SSMS / `sqlcmd`). Vì file đã đúng
   thứ tự cha-con, chạy 1 lần từ đầu đến cuối sẽ không lỗi FK.

   Nếu database đã được tạo theo schema cũ với `TenDangNhap NVARCHAR(100)`,
   mở rộng cột trước khi dùng email làm tên đăng nhập:

   ```sql
   DROP INDEX UQ_TaiKhoan_TenDangNhap ON TaiKhoan;
   ALTER TABLE TaiKhoan ALTER COLUMN TenDangNhap NVARCHAR(254) NULL;
   CREATE UNIQUE INDEX UQ_TaiKhoan_TenDangNhap ON TaiKhoan(TenDangNhap)
     WHERE TenDangNhap IS NOT NULL;
   ```

   `backend/.env.example` là mẫu cấu hình. `GOOGLE_CLIENT_ID`/`SECRET` lấy
   từ Google Cloud Console (Authorized redirect URI:
   `http://localhost:3000/auth/google/callback`). `GMAIL_APP_PASSWORD` lấy
   từ myaccount.google.com/apppasswords.

4. **Cài đặt & khởi tạo dữ liệu mẫu**:

   ```bash
   pnpm install
   pnpm --dir backend install
   pnpm --dir frontend install --frozen-lockfile
   pnpm start        # tự tạo tài khoản admin/admin ở môi trường không phải production
   ```

   Khi backend khởi động trong môi trường không phải production, nếu chưa có
   tài khoản `admin`, hệ thống tự tạo tài khoản kiểm thử `admin` / `admin`.
   Nếu đã có tài khoản admin thì mật khẩu hiện tại được giữ nguyên.
   Có thể đặt `ADMIN_EMAIL` trong `backend/.env` để tài khoản kiểm thử cũng
   nhận được email khôi phục mật khẩu.
   **Không dùng tài khoản mặc định này trong production**; đặt
   `NODE_ENV=production` trước khi chạy. Có thể chủ động khởi tạo admin bằng
   `pnpm run seed`.

   Backend và frontend có lockfile riêng. Nếu `pnpm start` báo không tìm thấy
   `frontend/node_modules/vite`, cài lại dependency frontend bằng lệnh
   `pnpm --dir frontend install --frozen-lockfile`, sau đó chạy lại `pnpm start`.

   Khi phát triển, chạy `pnpm run dev` ở thư mục gốc; frontend chạy tại
   `http://localhost:5173`, backend API tại `http://localhost:3000`.

5. **Kiểm tra bằng Postman**:
   - `GET http://localhost:3000/health` → phải trả `{"status":"ok"}`
   - `POST http://localhost:3000/auth/login` body
     `{"tenDangNhap":"admin","matKhau":"admin"}` → phải trả về
     `accessToken` + `refreshToken`
   - Mở `/quen-mat-khau`, nhập email tài khoản để nhận liên kết; liên kết mở
     `/dat-lai-mat-khau` và cho phép đặt mật khẩu mới. Cần cấu hình
     `GMAIL_USER`, `GMAIL_APP_PASSWORD` và `FRONTEND_URL` trong `backend/.env`.
   - `POST http://localhost:3000/auth/dang-ky` (admin/HR đã đăng nhập) với
     body `{"tenDangNhap":"nhanvien@gmail.com","matKhau":"matkhau123","hoTen":"Nguyen Van A"}`
     → tạo email làm tên đăng nhập, lưu mật khẩu bcrypt và tạo-liên kết
     `NhanVienId`; có thể truyền `nhanVienId` thay cho `hoTen` để liên kết
     nhân viên đã tồn tại
   - Mở trình duyệt `http://localhost:3000/auth/google` → phải chuyển hướng
     sang màn hình chọn tài khoản Google

6. **Chạy test tự động**:
   ```bash
   pnpm test
   ```
   Lưu ý: các test đăng nhập trong `tests/auth.test.js` cần database SQL Server
   và tài khoản `admin`; khởi động backend ở môi trường không phải production
   hoặc chạy `pnpm run seed` trước.

## Tiêu chí "đạt" để chuyển sang Giai đoạn 2 (Tổ chức)

- [ ] `db/schema.sql` chạy xong không lỗi trên DB rỗng
- [ ] `pnpm run seed` tạo được tài khoản admin
- [ ] Backend tự tạo admin/admin khi khởi động ở môi trường không phải production
- [ ] Đăng nhập thường qua Postman trả về đúng 2 token
- [ ] Đăng nhập Google chuyển hướng và tạo được `TaiKhoan` mới (kiểm tra
      trong DB thấy `NhaCungCapOAuth = 'google'` và `MaNguoiDungOAuth` có giá trị)
- [ ] Sau khi đăng nhập Google, `TaiKhoan.TenDangNhap` và `TaiKhoan.Email`
      khớp email Google (không còn NULL); đăng nhập lần 2 sau khi đổi tên/
      email trên Google thì 2 cột này được đồng bộ lại
- [ ] Đăng ký tài khoản mới dùng email làm `TenDangNhap`, bcrypt mã hóa
      `MatKhau`, và tự tạo/liên kết `NhanVienId` (hoặc liên kết nhân viên có sẵn)
- [ ] Đăng nhập Google tạo hồ sơ trong `NhanVien` và liên kết với `TaiKhoan`
- [ ] `pnpm test` chạy xanh toàn bộ test

**Xác nhận đủ các tiêu chí trên rồi báo lại — tôi mới viết tiếp Giai đoạn 2
(Tổ chức: PhongBan/ChucVu/ChucDanh/Định biên), theo đúng yêu cầu "kiểm tra
từng tính năng trước khi tiến về phía trước".**
