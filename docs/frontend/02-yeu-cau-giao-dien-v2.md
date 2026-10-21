# Yêu cầu giao diện – Bản 2 (có thể đã lỗi thời một phần)

## 1. Xác thực (`/login`, `/register`)

- Form đăng nhập: email, mật khẩu (ẩn/hiện), Remember me, Quên mật khẩu.
- Form đăng ký: họ tên, email, mật khẩu, xác nhận mật khẩu. Tài khoản mới mặc định là Viewer, Admin nâng quyền sau.
- Social login Google/GitHub và thông báo lỗi (toast).

## 2. Dashboard (`/dashboard`)

- Sidebar có avatar, tên và nhãn vai trò. Menu: Dashboard, Tạo Test, Template, Lịch sử.
- Thẻ thống kê: Total, Pass Rate, Running, Failed gần nhất.
- Biểu đồ Pass/Fail theo ngày và bảng 5–10 test run gần đây.
- Nút "+ Tạo Test Mới" (ẩn với Viewer).

## 3. Tạo & Chạy Test (`/tests/new`)

- Dropdown Chọn Template, tự điền Tên, Yêu cầu, Expected.
- Tên test, Yêu cầu test, Phạm vi test (UI/API/DB...), Expected Output.
- Cấu hình nâng cao: môi trường, timeout, file đính kèm.
- Nút: Run Test, Lưu nháp, Lưu thành Template (Admin/Tester).
- Panel Real-time Logs ngay bên dưới, gồm progress bar, trạng thái và nút Hủy. Chạy xong có nút "Xem báo cáo".

## 4. Kết quả & Báo cáo (`/runs/:id`)

- Thẻ PASSED/FAILED, thời gian thực thi, mốc thời gian chạy.
- So sánh Expected vs Actual (diff viewer) và bảng từng bước.
- Xuất PDF, Export HTML, Copy link. Có thêm nút "Chạy lại".

## 5. Quản lý Template (`/templates`)

- Bảng: tên, người tạo, ngày cập nhật.
- Thêm, sửa, xóa (Admin/Tester). Viewer chỉ xem.

## 6. Lịch sử & Quản lý thành viên (`/history`, tab `/admin/users`)

- Tab Lịch sử: tìm kiếm, lọc Pass/Fail và theo ngày. Cột: ID, tên, người chạy, thời gian, trạng thái. Hành động: Xem báo cáo, Chạy lại (ẩn với Viewer).
- Tab Quản lý thành viên (chỉ Admin): danh sách user, gán Admin/Tester/Viewer, khóa tài khoản.

## Ma trận phân quyền

| Chức năng                        | Admin | Tester | Viewer |
| -------------------------------- | :---: | :----: | :----: |
| Xem Dashboard, Lịch sử, Báo cáo  |   ✔   |   ✔    |   ✔    |
| Run Test / Chạy lại / Hủy        |   ✔   |   ✔    |   ✘    |
| Thêm/sửa/xóa Template            |   ✔   |   ✔    |   ✘    |
| Xem Template                     |   ✔   |   ✔    |   ✔    |
| Quản lý thành viên               |   ✔   |   ✘    |   ✘    |

## Lưu ý khi triển khai

- Chặn quyền ở cả hai tầng: giao diện ẩn nút, middleware backend trả 403.
- Log real-time dùng SSE hoặc WebSocket. Nếu deploy Vercel thì nên dùng SSE hoặc polling, vì serverless không giữ WebSocket lâu.
- Nếu thiếu thời gian, ưu tiên làm trước các trang 1, 3, 4, 6. Trang 5 và tab quản lý thành viên làm sau.

## UI/UX

> Lưu ý: Thiết kế để tham khảo và hình dung chung về giao diện. Có thể thêm (nếu cần thiết) hoặc bỏ (nếu dư thừa) các chi tiết, không bắt buộc giống 100% để tiết kiệm thời gian.
>
> Thông tin kỹ thuật truy cập: `Design.md`

Danh sách màn hình (ảnh thiết kế không kèm trong file này):

- Login Screen
- Forgot password Screen
- Register Screen
- Dashboard Screen — *bỏ avatar + logout trên drawer*
- Create new test Screen
- RunDetail Screen
- Test History Screen — *thêm cột tick chọn để export*
- Template Management Screen
- User Management Screen
- 403 Unauthorized Screen
