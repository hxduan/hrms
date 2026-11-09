# HRMS Backend — Giai đoạn 1 đến 4

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
- Giai đoạn 2.1: chỉ admin/HR cấp tài khoản; mật khẩu tạm buộc đổi lần đầu;
  khóa tài khoản, gửi liên kết đặt lại mật khẩu và phân quyền theo vai trò
- Ảnh đại diện đã bỏ; giao diện hiển thị chữ cái đầu, không cần Cloudinary
- Module Tổ chức: phòng ban, chức vụ, chức danh, định biên và nhật ký thay đổi
- Giai đoạn 3: danh sách, lọc, phân trang và hồ sơ nhân viên; kiểm tra định biên;
  tra cứu địa chỉ tỉnh/phường xã
- Giai đoạn 4: hợp đồng, quá trình công tác, phụ cấp, người phụ thuộc và nghỉ việc

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

2. **Tạo database, chạy schema và migration theo thứ tự**:

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

   Cuối cùng chạy `backend/db/migrations/003_giai_doan_2_1.sql`. Migration này
   thêm cờ buộc đổi mật khẩu và trạng thái khóa tài khoản, đồng thời gỡ cột
   `NhanVien.AnhDaiDienUrl`. Không khởi động backend phiên bản 2.1 trước khi
   chạy xong migration này.

   Để bật Nhân sự, tiếp tục chạy `004_giai_doan_3.sql` rồi
   `005_giai_doan_4.sql`. Migration 004 thêm các trường hồ sơ nhân viên,
   đánh số nhân viên và thủ tục danh sách/chi tiết; migration 005 bổ sung dữ
   liệu hợp đồng, quá trình công tác, phụ cấp, người phụ thuộc và nghỉ việc.
   Không khởi động backend mới trước khi chạy đủ migration tương ứng.

   Nếu database đã được tạo theo schema cũ với `TenDangNhap NVARCHAR(100)`,
   mở rộng cột trước khi dùng email làm tên đăng nhập:

   ```sql
   DROP INDEX UQ_TaiKhoan_TenDangNhap ON TaiKhoan;
   ALTER TABLE TaiKhoan ALTER COLUMN TenDangNhap NVARCHAR(254) NULL;
   CREATE UNIQUE INDEX UQ_TaiKhoan_TenDangNhap ON TaiKhoan(TenDangNhap)
     WHERE TenDangNhap IS NOT NULL;
   ```

   `backend/.env.example` là mẫu cấu hình. `GOOGLE_CLIENT_ID`/`SECRET` lấy
   từ Google Cloud Console. Đặt Authorized redirect URI trùng với
   `${BACKEND_URL}/auth/google/callback`; mặc định local là
   `http://localhost:3000/auth/google/callback`. Khi triển khai ở domain khác,
   cập nhật `BACKEND_URL` và đăng ký đúng callback URL đó trong Google Cloud.
   Khi chạy `pnpm start`, frontend đã build được phục vụ cùng backend nên
   `FRONTEND_URL` mặc định theo `BACKEND_URL` (hoặc
   `http://localhost:<PORT>`). Khi chạy `pnpm run dev`, mặc định là
   `http://localhost:5173`. Nếu frontend được phục vụ ở địa chỉ khác, đặt
   `FRONTEND_URL` trong `backend/.env` đúng với địa chỉ đó.
   `GMAIL_APP_PASSWORD` lấy từ myaccount.google.com/apppasswords.

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
   proxy Vite đã cấu hình cho các API của Giai đoạn 2–4.

4. **Kiểm tra bằng Postman**:
   - `GET http://localhost:3000/health` → phải trả `{"status":"ok"}`
   - `POST http://localhost:3000/auth/login` body
     `{"tenDangNhap":"admin","matKhau":"admin"}` → phải trả về
     `accessToken` + `refreshToken`
   - Tự đăng ký và quên mật khẩu công khai đã bị gỡ; admin/HR tạo tài khoản
     qua `POST /tai-khoan` với mật khẩu tạm
   - Admin/HR có thể khóa tài khoản hoặc gửi liên kết đặt lại mật khẩu qua email
   - Admin/HR quản lý hồ sơ tại `/nhan-su`; nhân viên chỉ xem hồ sơ của mình tại
     `/ho-so-cua-toi`
   - Danh mục loại hợp đồng và lý do nghỉ việc nằm tại Quản trị → Danh mục nhân sự
   - Mở trình duyệt `http://localhost:3000/auth/google` → phải chuyển hướng
     sang màn hình chọn tài khoản Google

5. **Chạy test tự động**:
   ```bash
   pnpm test
   ```
   Các bài kiểm tra luồng mật khẩu tạm và validation không cần kết nối DB.
   Bài kiểm tra đăng nhập thành công chỉ chạy khi cấu hình
   `HRMS_TEST_LOGIN_USERNAME` và `HRMS_TEST_LOGIN_PASSWORD`.

Quản trị viên cuối cùng bị mất quyền truy cập có thể đặt lại tài khoản từ máy
có quyền kết nối database bằng `node scripts/datLaiAdmin.js <tenDangNhap>
<matKhauMoi>`. Tài khoản được mở khóa, các phiên cũ bị thu hồi và người dùng
bị buộc đổi mật khẩu sau khi đăng nhập.
