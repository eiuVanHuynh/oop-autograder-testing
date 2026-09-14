# Traceability Matrix: Ánh xạ Yêu cầu Chức năng (FR) với Test Case

Bảng dưới đây đối chiếu trực tiếp giữa các Yêu cầu Chức năng (Functional Requirements - FR) từ tài liệu thiết kế kỹ thuật với các Test Case tương ứng trong hệ thống (`TC-01` đến `TC-44`).

| Yêu cầu Chức năng (FR) | Mô tả Yêu cầu | Test Case Liên quan | Ghi chú / Trạng thái Phủ (Coverage) |
| :--- | :--- | :--- | :--- |
| **FR-1** | Xác thực người dùng qua IRN/Password và Google OAuth | `TC-01`, `TC-02`, `TC-03`, `TC-04` | Đã phủ kín các trường hợp đăng nhập đúng/sai và giới hạn domain. |
| **FR-2** | Giới hạn domain Google OAuth nghiêm ngặt kết thúc bằng `@eiu.edu.vn` | `TC-03`, `TC-04` | Chặn hoàn toàn các tài khoản ngoài trường (vd: `@gmail.com`). |
| **FR-3** | Thiết lập tài khoản lần đầu cho người dùng đăng nhập Google | `TC-05` | Liên kết tên, mã IRN, ngày sinh và mật khẩu vào lần đầu tiên. |
| **FR-4** | Khôi phục mật khẩu tự động qua email (token hiệu lực 15 phút) | `TC-06`, `TC-07`, `TC-08`, `TC-09`, `TC-10` *(tính theo cụm reset)* | Kiểm thử từ khâu gửi yêu cầu, check email tồn tại, đến hết hạn token. |
| **FR-5** | Hiển thị danh sách Lab dạng card-based layout kèm attempt count và best score | `TC-13`, `TC-18` | Đảm bảo sinh viên chọn đúng lab và nắm được lịch sử điểm. |
| **FR-6** | Xử lý kéo thả thư mục (Dropzone) và tự động nhận diện `webkitRelativePath` | `TC-14`, `TC-17` | Parse chính xác cấu trúc `<<IRN>>_<<Name>>_lab_N/challenge_N`. |
| **FR-7** | Tự động biên dịch mã nguồn `.java` trong bộ nhớ và chấm điểm | `TC-14`, `TC-20` | Kích hoạt trình biên dịch ngay sau khi upload thành công. |
| **FR-8** | Đánh giá qua 3 trụ cột: MMD Diagram, Declaration Test, Operational Testcases | `TC-16`, `TC-17`, `TC-18`, `TC-21` | Phủ kín logic chấm điểm từng phần (partial credit) và thực thi Reflection. |
| **FR-9** | Theo dõi lịch sử nộp bài (Submission History) theo thời gian | `TC-22`, `TC-27` | Lưu trữ và hiển thị chi tiết các lần nộp trước đó. |
| **FR-10** | Quản lý Rubric, cấu trúc lớp, quan hệ MMD và Operational Testcases bởi giảng viên | `TC-23`, `TC-24`, `TC-25`, `TC-26`, `TC-27`, `TC-32 đến TC-39` | Cho phép giảng viên tạo/sửa/xóa và chạy thử dry-run. |
| **FR-11** | Bảng điều khiển giảng viên (Lecturer Dashboard) real-time | `TC-28` | Thống kê số bài nộp, điểm trung bình lớp và biểu đồ phân phối. |
| **FR-12** | Quản lý người dùng: thêm đơn lẻ, thêm hàng loạt qua CSV, cập nhật, xóa mềm | `TC-08`, `TC-09`, `TC-10`, `TC-11`, `TC-12`, `TC-40 đến TC-43` | Đảm bảo thao tác đầy đủ trên giao diện Quản lý Người dùng. |
| **FR-13** | Xuất dữ liệu ma trận điểm (Grade Matrix & Export định dạng Excel, PDF, SVG) | `TC-30` | Hỗ trợ trích xuất báo cáo kết quả học tập của sinh viên. |
| **FR-14** | Phân tích cấu trúc chi tiết và bắt lỗi thành phần (Class members, modifiers) | `TC-16`, `TC-17` | Phục vụ chấm điểm trụ cột 1 và 2. |
| **FR-15** | Cấp điểm phần trăm (Partial credit) cho các thuộc tính khớp một phần | `TC-17`, `TC-22` | Tránh việc đánh trượt toàn bộ nếu chỉ sai nhỏ (vd: access modifier). |
| **FR-16** | Lưu trữ nhật ký nộp bài và phân quyền bảo mật (Role-based access control) | `TC-27`, `TC-31`, `TC-44` | Ngăn chặn sinh viên truy cập trái phép vào các route/API của giảng viên (Lỗi 403). |