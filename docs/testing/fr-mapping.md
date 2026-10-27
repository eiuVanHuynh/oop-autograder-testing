# Traceability Matrix: Ánh xạ Yêu cầu Chức năng (FR) với Test Case

> **Phạm vi:** FR trong bảng này là yêu cầu chức năng của **SUT – website OOP AutoGrader**, đối chiếu với
> [`test-case-matrix.md`](./test-case-matrix.md) (`TC-01` → `TC-31`).
> Không nhầm với yêu cầu chức năng của *nền tảng test automation* này – nằm ở [`../architecture/SRS.md`](../architecture/SRS.md) mục 7.
>
> **Đã sửa (17/10/2026):** bản cũ tham chiếu tới `TC-32` → `TC-44` và nói ma trận có 44 test case. Ma trận chỉ có **31** test case,
> các tham chiếu không tồn tại đã được thay bằng TC thật. Một vài ánh xạ sai cũng được chỉnh (chi tiết ở cuối trang).

| Yêu cầu Chức năng (FR) | Mô tả Yêu cầu | Test Case Liên quan | Ghi chú / Trạng thái Phủ (Coverage) |
| :--- | :--- | :--- | :--- |
| **FR-1** | Xác thực người dùng qua IRN/Password và Google OAuth | `TC-01`, `TC-02`, `TC-03`, `TC-04` | Đã phủ kín các trường hợp đăng nhập đúng/sai và giới hạn domain. |
| **FR-2** | Giới hạn domain Google OAuth nghiêm ngặt kết thúc bằng `@eiu.edu.vn` | `TC-03`, `TC-04` | Chặn hoàn toàn các tài khoản ngoài trường (vd: `@gmail.com`). |
| **FR-3** | Thiết lập tài khoản lần đầu cho người dùng đăng nhập Google | `TC-05` | Liên kết tên, mã IRN, ngày sinh và mật khẩu vào lần đầu tiên. |
| **FR-4** | Khôi phục mật khẩu tự động qua email (token hiệu lực 15 phút) | `TC-06`, `TC-07` | Phủ khâu gửi yêu cầu và đặt lại mật khẩu qua link. **Chưa phủ:** token hết hạn / dùng lại token – cần bổ sung TC mới. |
| **FR-5** | Hiển thị danh sách Lab dạng card-based layout kèm attempt count và best score | `TC-13` | Đảm bảo sinh viên chọn đúng lab và nắm được lịch sử điểm. |
| **FR-6** | Xử lý kéo thả thư mục (Dropzone) và tự động nhận diện `webkitRelativePath` | `TC-14`, `TC-15` | Parse chính xác cấu trúc `<<IRN>>_<<Name>>_lab_N/challenge_N`; `TC-15` phủ trường hợp sai tên thư mục. |
| **FR-7** | Tự động biên dịch mã nguồn `.java` trong bộ nhớ và chấm điểm | `TC-14`, `TC-18` | Kích hoạt trình biên dịch ngay sau khi upload thành công. |
| **FR-8** | Đánh giá qua 3 trụ cột: MMD Diagram, Declaration Test, Operational Testcases | `TC-16`, `TC-17`, `TC-18`, `TC-21` | Phủ kín logic chấm điểm từng phần (partial credit) và thực thi Reflection. |
| **FR-9** | Theo dõi lịch sử nộp bài (Submission History) theo thời gian | `TC-22` | Lưu trữ và hiển thị chi tiết các lần nộp trước đó. |
| **FR-10** | Quản lý Rubric, cấu trúc lớp, quan hệ MMD và Operational Testcases bởi giảng viên | `TC-23`, `TC-24`, `TC-25`, `TC-26`, `TC-27` | Cho phép giảng viên tạo/sửa/xóa và chạy thử dry-run. |
| **FR-11** | Bảng điều khiển giảng viên (Lecturer Dashboard) real-time | `TC-28` | Thống kê số bài nộp, điểm trung bình lớp và biểu đồ phân phối. |
| **FR-12** | Quản lý người dùng: thêm đơn lẻ, cập nhật, đổi mật khẩu, xóa mềm (trang `Users`) + ghi danh hàng loạt qua CSV (trang `Quarters`) | `TC-08`, `TC-09`, `TC-10`, `TC-11`, `TC-12` | ⚠️ **Thêm tài khoản hàng loạt qua CSV không có trên giao diện** – `POST /api/users/bulk` tồn tại ở backend nhưng không được frontend gọi. `TC-09` đã sửa thành *ghi danh* vào quarter. |
| **FR-13** | Xuất dữ liệu ma trận điểm (Grade Matrix & Export định dạng Excel, PDF, SVG) | `TC-29`, `TC-30` | `TC-29` xem ma trận điểm, `TC-30` xuất báo cáo kết quả học tập. |
| **FR-14** | Phân tích cấu trúc chi tiết và bắt lỗi thành phần (Class members, modifiers) | `TC-16`, `TC-17` | Phục vụ chấm điểm trụ cột 1 và 2. |
| **FR-15** | Cấp điểm phần trăm (Partial credit) cho các thuộc tính khớp một phần | `TC-17`, `TC-19`, `TC-20` | Tránh đánh trượt toàn bộ khi chỉ sai nhỏ; phủ cả trường hợp thiếu trụ cột / thiếu challenge. |
| **FR-16** | Lưu trữ nhật ký nộp bài và phân quyền bảo mật (Role-based access control) | `TC-22`, `TC-31` | Ngăn chặn sinh viên truy cập trái phép vào các route/API của giảng viên (Lỗi 403). |

## Khoảng trống độ phủ (cần bổ sung test case)

| FR | Thiếu gì | Đề xuất |
| --- | --- | --- |
| **FR-4** | Chưa có TC cho token reset **hết hạn 15 phút** và token **dùng lại lần 2**. | Thêm `TC-32`, `TC-33`. |
| **FR-13** | Chưa kiểm tra **nội dung** file xuất (Excel/PDF/SVG), mới chỉ kiểm tra tải về. | Mở rộng `TC-30` hoặc thêm TC mới. |
| **FR-16** | Chưa phủ truy cập trái phép ở mức **API trực tiếp** (không qua UI). | Thêm TC gọi API bằng token Student. |

## Thay đổi so với bản trước

- Bỏ mọi tham chiếu tới `TC-32` → `TC-44` (không tồn tại trong ma trận).
- **FR-5:** bỏ `TC-18` (đây là Trụ cột 3, không liên quan danh sách Lab).
- **FR-9:** bỏ `TC-27` (đây là Dry-run của giảng viên, không phải lịch sử nộp bài).
- **FR-13:** thêm `TC-29` (xem ma trận điểm) bên cạnh `TC-30`.
- **FR-15:** thay `TC-22` bằng `TC-19`, `TC-20` (các case tính điểm khi thiếu trụ cột/challenge).
- **FR-16:** bỏ `TC-27`, giữ `TC-22` và `TC-31`.
