# Tích hợp Gói A — Giai đoạn 3–4

Tài liệu ghi lại việc hợp nhất `hrms-goi-a-giai-doan-3-4` vào `backend` và `frontend`, đồng thời giữ lại các phần xác thực, phân quyền và tổ chức đã được tùy chỉnh trong dự án. Không sao chép đè các thành phần dùng chung khi dự án đã có phiên bản riêng.

## Phạm vi tính năng

### Giai đoạn 3 — Hồ sơ nhân viên

- Danh sách nhân viên có tìm kiếm không dấu, lọc, phân trang và sắp xếp phía máy chủ. Bộ lọc và trạng thái sắp xếp được lưu trong query URL.
- Tạo, sửa, xem chi tiết hồ sơ; cấp mã nhân viên tuần tự bằng `SeqMaNhanVien`.
- Kiểm tra định biên theo phòng ban/chức danh; trường hợp vượt định biên yêu cầu xác nhận và lý do.
- Kiểm tra trùng CCCD, email, số sổ BHXH và mã số thuế; các giá trị duy nhất chỉ áp dụng cho nhân viên chưa xóa mềm.
- Quản lý địa chỉ hai cấp tỉnh/thành và phường/xã. Backend lưu đệm dữ liệu địa chỉ; giao diện hỗ trợ nhập thủ công khi API địa chỉ không dùng được.
- Nhân viên chỉ xem được hồ sơ của mình qua trang **Hồ sơ của tôi**.

### Giai đoạn 4 — Hợp đồng và vòng đời nhân viên

- Quản lý hợp đồng, kiểm tra thời gian chồng lấn, theo dõi trạng thái và xem hợp đồng sắp hết hạn.
- Lưu lịch sử quá trình công tác, điều chuyển có ngày hiệu lực và đồng bộ các thay đổi đã đến hạn.
- Quản lý phụ cấp và người phụ thuộc.
- Lập quyết định nghỉ việc có ngày hiệu lực; đồng bộ trạng thái làm việc và tùy chọn khóa tài khoản.
- Quản lý danh mục loại hợp đồng và lý do nghỉ việc trong khu vực Quản trị.
- Xóa nhân viên theo các ràng buộc dữ liệu liên quan; hồ sơ đã phát sinh dữ liệu cần dùng luồng nghỉ việc thay vì xóa.

## Cách hợp nhất, tránh trùng lặp

- Giữ nguyên cấu trúc khởi tạo ứng dụng tại `backend/src/app.js` và lịch đồng bộ tại `backend/server.js`; chỉ mount các router Nhân sự vào luồng hiện hữu.
- Dùng một prefix chuẩn cho danh mục Nhân sự: `/danh-muc-nhan-su/loai-hop-dong` và `/danh-muc-nhan-su/ly-do-nghi-viec`. Không tạo thêm alias `/loai-hop-dong` hoặc `/ly-do-nghi-viec`.
- Giữ các thành phần xác thực, OAuth Google, API client, layout và phân quyền sẵn có. Các trang Giai đoạn 3–4 được nối vào router/layout hiện tại thay vì đưa thêm bộ khung ứng dụng thứ hai.
- Tái sử dụng `FormPanel`, `Truong`, `DataTable`, `TabDanhSach` và `PhanTrang`. `DataTable` hiện hỗ trợ sắp xếp phía máy chủ; `FormPanel` hiển thị cảnh báo khi bước kiểm tra dữ liệu trùng gặp lỗi.
- Giữ các endpoint danh mục thống nhất giữa frontend và backend trong `frontend/src/pages/NhanSu/tabHoSo.jsx` và Postman.
- Migration 005 có bước bổ sung lịch sử tiếp nhận cho nhân viên cũ đã có phòng ban nhưng chưa có bản ghi quá trình công tác. Bước này bỏ qua nhân viên đã có lịch sử chưa xóa mềm nên chạy lại không tạo bản ghi trùng.
- Chỉ giữ một bộ Postman tổng hợp Giai đoạn 1–4 tại `backend/postman/HRMS-GiaiDoan1-4.postman_collection.json`; các URL danh mục trong bộ sưu tập đã đổi sang prefix chuẩn của ứng dụng.

## Các phần được thêm hoặc cập nhật

### Backend

| Khu vực | Thay đổi |
|---|---|
| `backend/db/migrations/004_giai_doan_3.sql` | Bổ sung trường và chỉ mục hồ sơ, sequence cấp mã, thủ tục danh sách/tổng quan nhân viên. |
| `backend/db/migrations/005_giai_doan_4.sql` | Bổ sung cấu trúc hợp đồng, quá trình công tác, nghỉ việc, phụ cấp, người phụ thuộc và thủ tục đồng bộ; tạo lịch sử tiếp nhận còn thiếu cho nhân viên cũ đã có phòng ban. |
| `backend/src/routes/nhanVien*.js` | API hồ sơ, các tab hồ sơ, phân quyền xem hồ sơ cá nhân, kiểm tra định biên và các thao tác vòng đời. |
| `backend/src/routes/hopDong.js`, `diaChi.js`, `danhMucNhanSu.js` | API hợp đồng, địa chỉ và danh mục Nhân sự. |
| `backend/src/services/` và `backend/src/validation/nhanSu.js` | Phân trang, kiểm tra chồng lấn hợp đồng, cache địa chỉ, đồng bộ định kỳ và kiểm tra dữ liệu. |
| `backend/tests/nhanSu*.test.js` | Kiểm tra route, nghiệp vụ và validation của các API Nhân sự. |
| `backend/postman/HRMS-GiaiDoan1-4.postman_collection.json` | Bộ kiểm thử API tổng hợp; thay cho collection Giai đoạn 1–2 cũ để tránh hai bộ có nội dung chồng lặp. |

### Frontend

| Khu vực | Thay đổi |
|---|---|
| `frontend/src/pages/NhanSu/` | Danh sách, thêm/sửa, chi tiết, hồ sơ cá nhân và các tab hợp đồng/công tác/phụ cấp/người phụ thuộc/nghỉ việc. |
| `frontend/src/pages/QuanTri/DanhMuc.jsx` | Quản lý danh mục loại hợp đồng và lý do nghỉ việc. |
| `frontend/src/components/DataTable.jsx` | Sắp xếp cột qua callback phía máy chủ, hiển thị trạng thái sắp xếp và `aria-sort`. |
| `frontend/src/components/FormPanel.jsx`, `Truong.jsx`, `DiaChiChon.jsx` | Biểu mẫu hồ sơ, kiểm tra và chọn địa chỉ; giữ lại cảnh báo lỗi kiểm tra từ xa. |
| `frontend/src/components/HistoryModal.jsx` | Bổ sung nhãn tiếng Việt cho các trường hồ sơ và nghiệp vụ Nhân sự trong lịch sử thay đổi. |
| `frontend/src/App.jsx`, layout và menu hiện có | Khai báo trang/điều hướng theo vai trò, không tạo router hoặc layout thứ hai. |

## API danh mục chuẩn

| Chức năng | Endpoint |
|---|---|
| Danh sách/tạo/sửa/xóa loại hợp đồng | `/danh-muc-nhan-su/loai-hop-dong` |
| Danh sách/tạo/sửa/xóa lý do nghỉ việc | `/danh-muc-nhan-su/ly-do-nghi-viec` |
| Hồ sơ nhân viên và các tab | `/nhan-vien` và các route con |
| Hợp đồng sắp hết hạn | `/hop-dong/sap-het-han` |
| Dữ liệu địa chỉ | `/dia-chi/tinh` và `/dia-chi/phuong-xa` |

## Cập nhật cơ sở dữ liệu và chạy ứng dụng

1. Sao lưu database trước khi thay đổi schema.
2. Chạy lần lượt `backend/db/migrations/004_giai_doan_3.sql` rồi `backend/db/migrations/005_giai_doan_4.sql` trên đúng database. Không chạy ngược thứ tự.
3. Đảm bảo cấu hình môi trường backend đã có các biến cần thiết; không đưa `backend/.env` vào tài liệu hoặc commit.
4. Chạy kiểm thử backend bằng `pnpm --filter hrms-backend test`.
5. Build frontend bằng `pnpm --filter hrms-frontend run build`.
6. Có thể import collection Postman và chạy các folder theo thứ tự 00–05 sau khi migrations và database đã sẵn sàng.

Yêu cầu của gói: SQL Server 2017 trở lên và Node.js 18 trở lên. Nguồn API địa chỉ bên ngoài cần được xác thực trong môi trường thực tế; form có chế độ nhập thủ công nếu nguồn đó không khả dụng.

## Kiểm thử và việc cần xác nhận

- Kiểm thử tự động và frontend build được chạy sau thay đổi; kết quả cụ thể được báo trong phần tổng kết triển khai.
- Chưa xác nhận bằng database SQL Server thật nếu migrations chưa được áp dụng. Cần chạy migrations trên database đã sao lưu và kiểm tra các luồng Postman/UI sau khi triển khai.
- Các cờ bảo hiểm và cách tính thuế của loại hợp đồng mẫu là dữ liệu cấu hình; cần bộ phận chuyên môn xác nhận trước khi dùng nghiệp vụ chính thức.
- Đồng bộ ngày hiệu lực dùng ngày giờ của SQL Server; cần bảo đảm múi giờ máy chủ phù hợp môi trường vận hành.
