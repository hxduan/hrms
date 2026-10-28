# HRMS Backend — Giai đoạn 1 + 2

## Đã tích hợp

- Kết nối SQL Server (`src/db.js`)
- Schema CSDL đầy đủ, đúng thứ tự phụ thuộc (`db/schema.sql`)
- Đăng nhập tài khoản thường (bcrypt) + Google OAuth (Passport)
- Refresh token
- Middleware dùng chung: xác thực JWT, phân quyền, validate (Zod), xử lý lỗi
  tập trung, rate limit chống dò mật khẩu
- Nhật ký thay đổi (`src/services/nhatKy.js`) — sẵn sàng cho các Giai đoạn sau
- Ghi log (Winston + Morgan)
- Test tự động (Jest + Supertest) + CI (GitHub Actions, chỉ chạy test)
- Giai đoạn 2: tự đăng ký, quên/đặt lại mật khẩu, đổi email/mật khẩu, quản trị
  tài khoản và phân quyền theo vai trò
- Module Tổ chức: phòng ban, chức vụ, chức danh, định biên và nhật ký thay đổi

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

2. **Tạo database, chạy schema và migration giai đoạn 2**:

   ```sql
   CREATE DATABASE nhan_su;
   ```

   Tên database phải khớp với `DB_NAME` trong `backend/.env` (mặc định là
   `nhan_su`). Sau đó chạy toàn bộ nội dung `backend/db/schema.sql` trên
   database đó (dùng Azure Data Studio / SSMS / `sqlcmd`). Vì file đã đúng
   thứ tự cha-con, chạy 1 lần từ đầu đến cuối sẽ không lỗi FK.

   Tiếp theo chạy `backend/db/migrations/002_giai_doan_2.sql` trên cùng
   database. Migration bổ sung các cột, chỉ mục và stored procedure cần thiết;
   nếu database giai đoạn 1 đang dùng cột `TaiKhoan.MatKhau`, migration sẽ
   chuyển hash hiện có sang `MatKhauMaHoa` mà không đổi mật khẩu.

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
   Khi chạy frontend bằng Vite, `FRONTEND_URL` mặc định là
   `http://localhost:5173`; nếu dùng địa chỉ khác, hãy đặt biến này trong
   `backend/.env` đúng với địa chỉ frontend.

3. **Cài đặt & khởi tạo dữ liệu mẫu**:

   ```bash
   pnpm install
   pnpm --dir backend install
   pnpm --dir frontend install --frozen-lockfile
   pnpm run seed     # tạo dữ liệu mẫu cho Tổ chức, HR và nhân viên
   pnpm start        # tự tạo tài khoản admin/admin ở môi trường không phải production
   ```

   Khi backend khởi động trong môi trường không phải production, nếu chưa có
   tài khoản `admin`, hệ thống tự tạo tài khoản kiểm thử `admin` / `admin`.
   Nếu đã có tài khoản admin thì mật khẩu hiện tại được giữ nguyên.
   **Không dùng tài khoản mặc định này trong production**; đặt
   `NODE_ENV=production` trước khi chạy. Có thể chủ động khởi tạo admin bằng
   `pnpm run seed`.

   Backend và frontend có lockfile riêng. Nếu `pnpm start` báo không tìm thấy
   `frontend/node_modules/vite`, cài lại dependency frontend bằng lệnh
   `pnpm --dir frontend install --frozen-lockfile`, sau đó chạy lại `pnpm start`.

   Khi phát triển, chạy `pnpm run dev` ở thư mục gốc; frontend chạy tại
   `http://localhost:5173`, backend API tại `http://localhost:3000`. CORS và
   proxy Vite đã cấu hình cho các API của Giai đoạn 2.

4. **Kiểm tra bằng Postman**:
   - `GET http://localhost:3000/health` → phải trả `{"status":"ok"}`
   - `POST http://localhost:3000/auth/login` body
     `{"tenDangNhap":"admin","matKhau":"admin"}` → phải trả về
     `accessToken` + `refreshToken`
   - `POST http://localhost:3000/auth/tu-dang-ky` tạo tài khoản nhân viên
     chưa gắn hồ sơ; admin/HR tạo tài khoản qua `POST /tai-khoan`
   - Mở trình duyệt `http://localhost:3000/auth/google` → phải chuyển hướng
     sang màn hình chọn tài khoản Google

5. **Chạy test tự động**:
   ```bash
   pnpm test
   ```
   Các bài kiểm tra API cần SQL Server. Bài kiểm tra đăng nhập thành công chỉ
   chạy khi cấu hình `HRMS_TEST_LOGIN_USERNAME` và `HRMS_TEST_LOGIN_PASSWORD`;
   các bài kiểm tra validation không cần kết nối database.
