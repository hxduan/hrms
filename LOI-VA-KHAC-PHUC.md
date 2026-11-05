# Tổng hợp lỗi backend và hướng khắc phục

## Phạm vi

Đã tổng hợp `backend/logs/loi.log` (84 bản ghi lỗi, từ ngày 20/10/2026 đến
28/10/2026). Các stack trace và chi tiết phản hồi đăng nhập Gmail không được
sao chép vào tài liệu này.

## Các lỗi ghi nhận

| Nhóm lỗi | Số lần | Nguyên nhân | Cách khắc phục |
|---|---:|---|---|
| Không tìm thấy `sp_LayCayPhongBan` | 46 | Database chưa có stored procedure của Giai đoạn 2. | Chạy `backend/db/migrations/002_giai_doan_2.sql`. |
| Không tìm thấy `sp_BaoCaoDinhBien` | 13 | Database chưa có stored procedure báo cáo của Giai đoạn 2. | Chạy `backend/db/migrations/002_giai_doan_2.sql`. |
| Thiếu cột `ThuTu` | 12 | Schema `ChucVu`/`PhongBan` chưa được cập nhật. | Chạy migration 002. |
| Thiếu cột `MaPhongBan` | 4 | Schema `PhongBan` chưa được cập nhật. | Chạy migration 002. |
| Thiếu cột `MatKhauMaHoa` | 2 | Database đang dùng schema cũ hoặc backend kết nối nhầm database. | Kiểm tra `DB_NAME`; với database Giai đoạn 1, chạy migration 002 để thêm/chuẩn hóa cột mật khẩu. |
| Thiếu cột `BatDoiMatKhau` | 2 | Database chưa được cập nhật theo Giai đoạn 2.1. | Chạy `backend/db/migrations/003_giai_doan_2_1.sql` sau migration 002. |
| Gmail từ chối thông tin đăng nhập (535) | 5 | `GMAIL_USER` hoặc `GMAIL_APP_PASSWORD` không hợp lệ, hoặc đang dùng mật khẩu Gmail thường. | Cấu hình đúng tài khoản và Google App Password trong `backend/.env`, rồi khởi động lại backend. |

Tổng cộng có 79 lỗi liên quan đến schema database và 5 lỗi gửi email. Nhiều
lỗi database là cùng một nguyên nhân gốc: database mà backend đang dùng chưa
được nâng cấp đầy đủ theo phiên bản hiện tại.

## Thứ tự xử lý database

1. Sao lưu database trước khi chạy migration. Migration 003 có thể xóa cột
   `NhanVien.AnhDaiDienUrl` nếu cột còn tồn tại.
2. Xác nhận `DB_NAME` trong `backend/.env` trỏ đến đúng database mà backend
   đang sử dụng. Không chia sẻ nội dung hoặc giá trị bí mật trong file này.
3. Với database mới, chạy `backend/db/schema.sql`, sau đó chạy lần lượt:
   - `backend/db/migrations/002_giai_doan_2.sql`
   - `backend/db/migrations/003_giai_doan_2_1.sql`
4. Với database Giai đoạn 1, chạy migration 002 rồi migration 003. Nếu
   migration 002 đã được áp dụng thành công trước đó, chỉ cần chạy migration
   003.
5. Chạy script bằng SSMS hoặc Azure Data Studio trên đúng database. Sau khi
   cả hai migration hoàn tất, khởi động lại backend và kiểm tra các API phòng
   ban, chức vụ, định biên và `/auth/me`.

## Xử lý lỗi Gmail

- Đặt `GMAIL_USER` là địa chỉ Gmail gửi thư.
- Tạo Google App Password và đặt vào `GMAIL_APP_PASSWORD`; không dùng mật khẩu
  đăng nhập Gmail thông thường.
- Khởi động lại backend sau khi cập nhật cấu hình.
- Không ghi giá trị mật khẩu ứng dụng vào log, mã nguồn hoặc tài liệu.

## Trạng thái

Đã sửa hướng dẫn trong `THAY-DOI-GIAI-DOAN-2-1.md` để database mới cũng chạy
migration 002 trước migration 003. Các migration chứa thay đổi cần thiết đã
có sẵn trong repository; cần áp dụng chúng trên đúng SQL Server để xác nhận
các lỗi schema đã hết. Lỗi Gmail cần cấu hình thông tin xác thực hợp lệ trên
môi trường chạy ứng dụng. Không thể xác nhận hai thao tác môi trường này chỉ
từ log trong repository.

## Lỗi khởi động bổ sung: `EADDRINUSE` trên cổng 3000

Lỗi này xảy ra khi chạy `pnpm start` trong lúc backend HRMS đã lắng nghe ở
cổng 3000. Frontend vẫn build thành công; lần khởi động backend thứ hai trước
đây bị dừng do trùng cổng.

`backend/server.js` hiện kiểm tra health endpoint trước khi kết nối database
và khởi động. Nếu nhận diện đúng HRMS đang chạy, lệnh bỏ qua lần khởi động
trùng và kết thúc thành công. Nếu cổng do ứng dụng khác sử dụng, backend báo
rõ cổng bị chiếm và không dừng tiến trình đó. Nếu cần khởi động lại backend
để nạp thay đổi mã nguồn, dừng server cũ bằng `Ctrl+C` trong terminal đang
chạy nó rồi chạy lại `pnpm start`.

## Lỗi đăng nhập Google không vào trang chính

Ở chế độ `pnpm start`, backend phục vụ frontend đã build trên cùng origin,
nhưng callback OAuth trước đây mặc định chuyển về `http://localhost:5173`
(địa chỉ Vite dev). Nếu Vite không chạy, người dùng không vào được trang
callback để lưu phiên và tiếp tục đến trang chính.

Backend hiện chọn URL chuyển hướng theo chế độ chạy: `pnpm start` dùng
`BACKEND_URL` hoặc `http://localhost:<PORT>`, còn `pnpm run dev` vẫn dùng
`http://localhost:5173`. `FRONTEND_URL` được cấu hình tường minh luôn được ưu
tiên. Sau khi cập nhật, cần dừng backend cũ và chạy lại `pnpm start` để callback
Google dùng cấu hình mới.
