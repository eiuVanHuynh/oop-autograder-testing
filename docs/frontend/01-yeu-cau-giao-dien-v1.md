# Yêu cầu giao diện – Bản 1 (có thể đã lỗi thời một phần)

> Bản mô tả ban đầu. Bản 2 (`02-yeu-cau-giao-dien-v2.md`) là bản chi tiết hơn và được ưu tiên khi có mâu thuẫn.

## 1. Trang Xác thực (Login / Register) & [MỚI] Tích hợp Phân quyền (RBAC)

Các thành phần:

- Form Đăng nhập / Đăng ký & Social Login (Google/GitHub).
- Bổ sung: Sau khi đăng nhập, hệ thống sẽ gán Vai trò (Role) cho tài khoản (Ví dụ: Admin, Tester, Viewer). Giao diện sẽ tự động ẩn/hiện các nút bấm (Ví dụ: Viewer chỉ được xem lịch sử và báo cáo, không được bấm nút "Run Test" hoặc xóa template).

## 2. Trang Dashboard (Tổng quan hệ thống)

Các thành phần:

- Thanh Sidebar / Header (Hiển thị Avatar, Tên và Nhãn vai trò như [Admin]).
- Thẻ thống kê nhanh (Total Tests, Pass Rate, Failed).
- Biểu đồ xu hướng & Bảng Test Run gần đây.
- Nút CTA "+ Tạo Test Mới".

## 3. Trang Tạo & Cấu hình Test (Test Input Form) – [ĐÃ CẬP NHẬT]

Đây là trang nhận nhiều cải tiến nhất:

- **Dropdown "Chọn Test Template"** (mới thêm ở đầu form):
  - Chức năng: Khi bấm vào, một dropdown xổ ra danh sách các kịch bản mẫu có sẵn (Ví dụ: Mẫu Test Đăng nhập chuẩn, Mẫu Test API Thanh toán, Mẫu Test Truy vấn Database sản phẩm).
  - Tác dụng: Khi người dùng chọn một Template, hệ thống sẽ tự động điền (auto-fill) sẵn vào các ô bên dưới (Tên test, Yêu cầu, Expected), giúp tiết kiệm 80% thời gian nhập liệu. Có kèm nút "Lưu cấu hình hiện tại thành Template mới" (chỉ hiển thị cho Admin/Tester).
- Input "Tên Test" (Test Name)
- Textarea "Yêu cầu test" (Test Requirements)
- Phạm vi test (Test Scope / Components) (Checkbox/Dropdown: UI, API, DB...)
- Kết quả kỳ vọng (Expected Output)
- Khu vực hiển thị Real-time Logs (Panel trượt hoặc khu vực ngay bên dưới): Bấm "Run Test" là log đổ trực tiếp ra đây mà không cần chuyển trang.

## 4. Trang Chi tiết Kết quả & Báo cáo (Test Results & Report Detail)

Các thành phần:

- Trạng thái tổng quan (Pass/Fail) và Thời gian thực thi.
- Khung so sánh Expected vs Actual Result (lấy từ DB/BE trả về).
- Bảng chi tiết từng bước (Test Steps Breakdown).
- Nút xuất báo cáo: Tải PDF, Export HTML, hoặc chia sẻ link.

## 5. Trang Quản lý Kịch bản Mẫu (Test Templates Management) – [MỚI TÁCH RIÊNG]

Lý do: Cần một nơi riêng để quản lý các template hiển thị trong dropdown ở trang Tạo Test.

Các thành phần:

- Bảng danh sách Template (Tên template, Người tạo, Ngày cập nhật).
- Nút "Thêm Template mới", "Chỉnh sửa", "Xóa" (Giới hạn quyền: Chỉ Admin/Tester mới được thao tác, Viewer chỉ được xem).

## 6. Trang Lịch sử Test & Quản lý Phân quyền (History & User Access)

Các thành phần:

- Lịch sử chạy test (Search, Filter theo trạng thái Pass/Fail).
- Dành riêng cho Admin: Thêm một tab nhỏ hoặc mục "Quản lý Thành viên" (User Management) để phân quyền tài khoản (gán user nào làm Admin, Tester hay Viewer).

## Sơ đồ luồng cập nhật (Updated User Flow)

1. Đăng nhập → Hệ thống nhận diện quyền (Ví dụ: Tester).
2. Vào trang Tạo Test → Bấm dropdown Chọn Test Template có sẵn để điền nhanh nội dung → Hoặc tự gõ.
3. Bấm "Run Test" → Theo dõi log trực tiếp trên cùng một màn hình.
4. Xem kết quả so sánh với DB ở Trang Báo cáo và có thể lưu lại kết quả hoặc chia sẻ.
