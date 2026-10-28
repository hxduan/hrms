# Chi tiết cập nhật HRMS theo Giai đoạn 2.1

Tài liệu ghi lại các thay đổi đã áp dụng từ bản tham chiếu
`hrms-giai-doan-2-1/` vào hai ứng dụng `backend/` và `frontend/`.
Giai đoạn 2.1 tập trung vào phân quyền luồng tài khoản và loại bỏ ảnh đại diện;
không thay thế các chức năng Tổ chức đã có từ Giai đoạn 2.

## 1. Kết quả chính

- Tắt đăng ký tài khoản và yêu cầu quên mật khẩu công khai.
- Admin/HR cấp tài khoản; người dùng đăng nhập lần đầu bằng mật khẩu tạm và
  buộc đổi mật khẩu trước khi sử dụng các chức năng khác.
- Admin/HR có thể khóa/mở khóa tài khoản và gửi email chứa liên kết đặt lại
  mật khẩu dùng một lần, có hiệu lực 30 phút.
- Giới hạn các thao tác của HR vào tài khoản nhân viên; chỉ admin được đổi vai
  trò.
- Bỏ ảnh đại diện khỏi database và gỡ các thư viện Cloudinary; giao diện dùng
  chữ cái đầu của tên làm avatar.
- Thêm migration, bộ sưu tập Postman, test và công cụ cứu hộ admin.

## 2. Thay đổi backend

| Thành phần | Thay đổi |
|---|---|
| `backend/src/routes/auth.js` | Gỡ `POST /auth/tu-dang-ky` và `POST /auth/quen-mat-khau`; giới hạn `GET /auth/kiem-tra-ten` cho admin/HR; kiểm tra trạng thái khóa khi đăng nhập và làm mới token; thêm cờ buộc đổi mật khẩu vào access token; cập nhật quy trình đổi/đặt lại mật khẩu. |
| `backend/src/routes/taiKhoan.js` | Cấp tài khoản với mật khẩu tạm; thêm thao tác khóa/mở khóa và gửi email khôi phục; giới hạn HR thao tác trên tài khoản nhân viên; ngăn admin cuối cùng tự khóa hoặc bị loại khỏi vai trò admin. |
| `backend/src/middleware/auth.js` | Khi token có cờ buộc đổi mật khẩu, chỉ cho xem `/auth/me` và gọi API đổi mật khẩu; chặn các API còn lại tại backend. |
| `backend/src/services/batDoiMatKhau.js` | Định nghĩa danh sách phương thức/đường dẫn được phép trong trạng thái buộc đổi mật khẩu. |
| `backend/src/services/khoiPhucMatKhau.js` | Sinh mã ngẫu nhiên, chỉ lưu SHA-256 trong database và đặt hạn 30 phút. |
| `backend/src/validation/taiKhoan.js`, `backend/src/validation/auth.js` | Bỏ schema đăng ký/quên mật khẩu công khai; bổ sung schema đặt mật khẩu tạm và trạng thái tài khoản; chỉ giữ schema đăng nhập trong validation xác thực. |
| `backend/db/migrations/003_giai_doan_2_1.sql` | Thêm `TaiKhoan.BatDoiMatKhau`, `TaiKhoan.HoatDong`; xóa `NhanVien.AnhDaiDienUrl`. Có thể chạy lại an toàn theo kiểm tra cột. |
| `backend/db/schema.sql` | Không tạo cột ảnh đại diện ở database mới. |
| `backend/scripts/datLaiAdmin.js` | Cung cấp lệnh đặt lại mật khẩu/mở khóa admin cuối cùng; thu hồi phiên cũ và buộc đổi mật khẩu ở lần đăng nhập kế tiếp. |
| `backend/package.json`, `backend/pnpm-lock.yaml` | Gỡ `cloudinary` và `multer-storage-cloudinary`; vẫn giữ `multer` để dùng cho nhu cầu import/export sau này. |
| `backend/.env.example` | Bổ sung mẫu cấu hình hiện tại; không ghi đè `backend/.env` đang dùng. |
| `backend/postman/HRMS-GiaiDoan1-2.postman_collection.json` | Bổ sung collection kiểm thử các API theo luồng 2.1. |
| `backend/tests/` | Cập nhật test validation/auth; thêm test cho middleware buộc đổi mật khẩu và xác nhận các API đăng ký/quên mật khẩu trả 404. |

### Quyền theo vai trò

- **Admin:** quản lý mọi tài khoản; tạo tài khoản với vai trò phù hợp; đổi vai
  trò, gắn hồ sơ, đặt mật khẩu tạm, gửi liên kết và khóa/mở khóa.
- **HR:** quản lý tài khoản nhân viên; không thao tác trên tài khoản admin/HR và
  không đổi vai trò.
- **Nhân viên:** chỉ tự đổi mật khẩu và cập nhật email theo các quy tắc hiện có.
- **Tài khoản đang dùng mật khẩu tạm:** chỉ được gọi `GET /auth/me` và
  `POST /auth/doi-mat-khau` cho đến khi đổi mật khẩu thành công.

Mọi giới hạn quyền quan trọng đều được kiểm tra ở backend; việc ẩn nút trên
giao diện không phải là lớp bảo vệ duy nhất.

## 3. Thay đổi frontend

| Thành phần | Thay đổi |
|---|---|
| `frontend/src/App.jsx` | Bỏ route và import đăng ký/quên mật khẩu; giữ đăng nhập, đặt lại mật khẩu qua liên kết và OAuth callback. |
| `frontend/src/pages/DangNhap/DangNhap.jsx` | Bỏ liên kết đăng ký/quên mật khẩu; hướng dẫn liên hệ HR để được cấp tài khoản hoặc nhận liên kết mới. |
| `frontend/src/pages/DangNhap/DangKy.jsx` | Xóa trang đăng ký công khai. |
| `frontend/src/pages/DangNhap/QuenMatKhau.jsx` | Xóa trang yêu cầu khôi phục công khai. |
| `frontend/src/pages/DangNhap/DatLaiMatKhau.jsx` | Khi liên kết thiếu mã, hướng dẫn liên hệ HR thay vì dẫn tới trang đã gỡ. |
| `frontend/src/auth/RequireAuth.jsx` | Điều hướng tài khoản buộc đổi mật khẩu tới trang tài khoản; tiếp tục áp dụng kiểm tra quyền theo vai trò. |
| `frontend/src/layouts/AppLayout.jsx` | Ẩn menu nghiệp vụ khi phải đổi mật khẩu; hiển thị cảnh báo và chữ cái đầu làm avatar; thông báo khi hồ sơ nhân viên chưa được gắn. |
| `frontend/src/pages/TaiKhoan/TaiKhoanCuaToi.jsx` | Hiển thị luồng đổi mật khẩu tạm và không cho đổi email trong bước bắt buộc này. |
| `frontend/src/pages/QuanTri/TaiKhoan.jsx` | Thêm giao diện cấp mật khẩu tạm, gửi email đặt lại, khóa/mở khóa và giới hạn hành động theo vai trò. |
| `frontend/src/api/client.js` | Bỏ các API công khai đã gỡ khỏi danh sách ngoại lệ làm mới token. |
| `frontend/src/components/Icon.jsx` | Bổ sung biểu tượng phục vụ các hành động tài khoản mới. |

Các màn hình Tổ chức, đăng nhập Google và callback OAuth hiện có được giữ lại.
Đường dẫn `/dang-ky` và `/quen-mat-khau` không còn là route ứng dụng.

## 4. Cập nhật database và khởi động

> **Sao lưu database trước khi chạy migration.** Migration 003 xóa cột
> `NhanVien.AnhDaiDienUrl`; dữ liệu ảnh trong cột này không được giữ lại.

1. Database mới: chạy `backend/db/schema.sql`, sau đó chạy migration 003 để
   thêm các cột trạng thái tài khoản mà backend phiên bản này cần.
2. Database đang ở Giai đoạn 1: chạy lần lượt migration 002 rồi migration 003.
   Database đã ở Giai đoạn 2: chỉ cần migration 003.
3. Chỉ khởi động backend phiên bản này sau khi migration 003 thành công.
4. Cài dependency/build/chạy ứng dụng:

   ```powershell
   pnpm install
   pnpm --dir backend install
   pnpm --dir frontend install
   pnpm --dir frontend run build
   pnpm dev
   ```

`backend/.env.example` là mẫu tham khảo. Không chép đè hoặc tự sửa
`backend/.env` hiện có; nếu file môi trường đang chứa `CLOUDINARY_*`, có thể
xóa các biến đó vì ảnh đại diện không còn dùng Cloudinary. Cấu hình Gmail trong
`.env` nếu cần gửi email đặt lại mật khẩu. Nếu Gmail chưa cấu hình, API gửi email
có thể trả 502 kèm thông báo phù hợp; việc này không có nghĩa là mã đặt lại mật
khẩu đã được gửi.

Để cứu hộ admin cuối cùng, chạy trên máy có quyền kết nối database:

```powershell
pnpm --dir backend exec node scripts/datLaiAdmin.js admin MatKhauMoi123
```

Thay `admin` bằng tên đăng nhập chính xác và dùng mật khẩu thỏa chính sách.
Không đưa mật khẩu thật vào lịch sử shell dùng chung hoặc tài liệu/commit.

## 5. Kiểm tra

```powershell
pnpm --dir backend test -- --runInBand
pnpm --dir frontend run build
```

Kiểm tra thủ công sau khi database và email đã cấu hình:

- Đăng nhập bằng tài khoản nhân viên mới: hệ thống bắt buộc đổi mật khẩu;
  thử gọi API khác trước khi đổi phải bị backend từ chối.
- Sau khi đổi mật khẩu, tài khoản vào được các trang theo vai trò; tài khoản
  chưa gắn hồ sơ nhận được cảnh báo phù hợp.
- HR không thể thao tác lên tài khoản admin/HR; nhân viên không vào được trang
  quản trị.
- Khóa tài khoản ngăn đăng nhập/làm mới phiên; mở khóa cho phép đăng nhập lại.
- Liên kết đặt lại mật khẩu dùng được một lần, hết hạn sau 30 phút.
- `/dang-ky` và `/quen-mat-khau` không còn cung cấp luồng công khai; API POST
  tương ứng trả 404.
- Chạy collection Postman theo thứ tự các thư mục trong collection. Nếu email
  chưa cấu hình, chấp nhận kết quả lỗi gửi email được ghi chú trong request.

## 6. Giới hạn được giữ nguyên từ bản tham chiếu

- Google OAuth vẫn có thể tự tạo tài khoản chưa gắn hồ sơ; bản tham chiếu ghi
  nhận đây là việc cần xử lý riêng khi cập nhật `passport.js` và test hồ sơ Google.
- Khóa tài khoản chặn đăng nhập và làm mới token; access token đã cấp có thể
  còn hiệu lực tối đa 15 phút.
- Thay đổi vai trò trên access token đã phát có thể mất tối đa 15 phút mới có
  hiệu lực; đăng nhập lại sẽ nhận quyền mới.
- Gửi liên kết đặt lại mật khẩu phụ thuộc cấu hình và hạn mức SMTP Gmail.
