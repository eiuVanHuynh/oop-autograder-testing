# Test Plan: Hệ thống Nộp bài & Chấm điểm Tự động

## 1. Tổng quan & Mục tiêu
Tài liệu này xác định chiến lược, phạm vi, môi trường và tiêu chí kiểm thử cho hệ thống **Quản lý Nộp bài và Chấm điểm Tự động**. Mục tiêu là đảm bảo toàn bộ các phân hệ từ xác thực, nộp bài, cơ chế chấm tự động 3 trụ cột đến giao diện quản lý của giảng viên hoạt động chính xác theo đúng tài liệu đặc tả kỹ thuật.

## 2. Phạm vi Kiểm thử (Test Scope)
Hệ thống được chia thành 3 module chính để kiểm thử:
- **Module 1: Xác thực & Quản lý Người dùng**
  - Đăng nhập trực tiếp bằng mã định danh (IRN) và mật khẩu (có mã băm).
  - Xác thực qua Google OAuth giới hạn nghiêm ngặt domain `@eiu.edu.vn`.
  - Luồng thiết lập tài khoản lần đầu cho Google User và khôi phục mật khẩu qua email (token 15 phút).
  - Quản lý tài khoản của giảng viên (thêm đơn lẻ, thêm hàng loạt qua CSV, cập nhật, reset mật khẩu, xóa mềm - soft delete).
- **Module 2: Nộp bài & Chấm điểm của Sinh viên**
  - Chọn lab từ dashboard (hiển thị số lần nộp và điểm cao nhất).
  - Kéo thả thư mục (`webkitRelativePath`) theo cấu trúc chuẩn `<<IRN>>_<<Name>>_lab_N/challenge_N`.
  - Kiểm thử 3 trụ cột chấm điểm:
    - *Trụ cột 1:* Phân tích sơ đồ MMD (Mermaid diagram).
    - *Trụ cột 2:* Kiểm tra khai báo lớp qua Reflection (Class Declaration) với điểm phần trăm (partial credit).
    - *Trụ cột 3:* Thực thi testcase vận hành (Operational Testcases) trả về trạng thái pass/fail hoặc I/O chi tiết.
  - Tổng hợp điểm, xử lý thiếu trụ cột/thử thách và xem lịch sử nộp bài.
- **Module 3: Quản lý của Giảng viên**
  - Quản lý cấu trúc Lab và Rubric (tạo/xóa lab, challenge, lớp).
  - Định nghĩa quan hệ MMD, cấu hình chi tiết class (modifiers, fields, methods, constructors) và testcase vận hành (Dry-run).
  - Bảng điều khiển trực tiếp (Lecturer Dashboard), ma trận điểm (Grade Matrix) và tính năng xuất dữ liệu (Excel, PDF, SVG).
  - Phân quyền bảo mật (Role-based access control, chặn sinh viên truy cập route/API giảng viên).

## 3. Môi trường & Công cụ Kiểm thử
- **Frontend UI Testing:** Trình duyệt web (Chrome, Firefox, Edge), công cụ tự động hóa UI (Selenium/Playwright hoặc kiểm thử thủ công qua ma trận TC-01 đến TC-44).
- **Backend & Grading Engine Testing:** Môi trường Java Runtime, `javax.tools.JavaCompiler`, Reflection API để biên dịch trong bộ nhớ.
- **Database & Auth:** Cơ sở dữ liệu lưu trữ tài khoản, token, cấu trúc rubric và phân quyền JWT.

## 4. Tiêu chí Pass / Fail (Acceptance Criteria)
- **Tiêu chí Đạt (Pass):** 
  - Tất cả các kịch bản kiểm thử chức năng (Functional) trả về kết quả khớp hoàn toàn với hành vi mong đợi trong ma trận Test Case.
  - Cơ chế chấm điểm tự động 3 trụ cột đánh giá đúng logic, phân phối điểm phần trăm chính xác và xử lý ngoại lệ mượt mà khi sai định dạng thư mục.
  - Phân quyền bảo mật hoạt động tuyệt đối (domain `@eiu.edu.vn` và chặn mã lỗi 403 đối với sinh viên).
- **Tiêu chí Không đạt (Fail):** 
  - Xảy ra lỗi hệ thống (Crash, Exception không bắt được) trong quá trình biên dịch code hoặc gọi API.
  - Lộ thông tin testcase ẩn (Hidden testcase) ra phía sinh viên.
  - Sai lệch dữ liệu điểm số giữa kết quả chấm tự động và cơ sở dữ liệu.