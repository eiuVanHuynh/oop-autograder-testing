# Tham chiếu hệ thống cần kiểm thử (SUT)

> **SUT:** OOP AutoGrader · `https://oop-autograder.vercel.app`
> **Source:** [github.com/Project-G5741/OOP-AutoGrader](https://github.com/Project-G5741/OOP-AutoGrader)
> **Đọc tại commit:** `01f6b47` (`main`, 2026-10-16)
>
> ⚠️ **Source ≠ bản deploy.** Bản chạy trên Vercel có thể là commit cũ hơn. Mọi giá trị dưới đây là **ứng viên để biết chỗ nào mà nhìn**,
> vẫn phải xác nhận bằng cách chạy thật rồi ghi exact message – đúng quy tắc ở
> [`../database/phan-biet-cac-loai-database.md`](../database/phan-biet-cac-loai-database.md) mục 8.
>
> Khi cập nhật file này, **ghi lại commit mới** ở trên.

## 1. Công nghệ của SUT

Backend **Java / Spring Boot**, frontend **React (JSX)**. Khác hẳn repo test automation của nhóm (Node.js) – đừng nhầm hai bên.

## 2. Route

| Path | Màn hình | TC liên quan |
| --- | --- | --- |
| `/` | Login | TC-01 → TC-07 |
| `/student-dashboard` | Chọn lab, upload, kết quả trực tiếp | TC-13 → TC-21 |
| `/student-history` | Lịch sử nộp bài, thống kê theo lab | TC-22 |
| `/lecturer-dashboard` | Tổng quan chấm bài, tab challenge, bảng bài nộp | TC-28 |
| `/lecturer-grading` | Grade matrix liên lab | TC-29 |
| `/lecturer-users` | Quản lý người dùng | TC-08 → TC-12 |
| `/lecturer-solution` | Trình soạn cấu trúc Lab / rubric | TC-23 → TC-27 |
| `/lecturer-report` | Báo cáo phân tích | TC-30 |

> ⚠️ Không có route nào tên `/login`. Trang đăng nhập là `/`.

## 3. API của SUT

Mọi endpoint bắt đầu bằng `/api`.

| Controller | Base path | Dùng cho |
| --- | --- | --- |
| `AuthController` | `/api/auth` | Login, Google OAuth, reset mật khẩu |
| `LabController` | `/api/labs` | Danh sách lab, thống kê, bài nộp |
| `LecturerRubricController` | `/api/lecturer/labs` | CRUD cấu trúc lab |
| `SubmissionController` | `/api/submissions` | Upload, chấm, lịch sử sinh viên |
| `UserController` | `/api/users` | CRUD user (chỉ giảng viên) |
| `AnalyticsController` | `/api/analytics` | Dashboard, báo cáo sinh viên |
| `MasterDataController` | `/api/master-data` | Tra cứu scope / type / relation |
| `TermController` | `/api/terms` | Học kỳ |
| `RootController` | `/` | Liveness probe |

## 4. ⚠️ SUT KHÔNG có `data-testid`

Đã grep toàn bộ `frontend/src`: **0 kết quả**.

Hệ quả: quy ước `testid=<giá trị>` trong `db/README.md` mục 3 **hiện không dùng được**. Chỉ còn `text=` và `placeholder=`.
Nhóm cần chọn một trong hai:

- Giữ nguyên, chỉ dùng `text=` / `placeholder=` – chấp nhận selector dễ vỡ khi SUT đổi chữ.
- Bổ sung thêm loại target vào `db/README.md`, ví dụ `role=` (`getByRole`) cho ổn định hơn.

## 5. Selector đã kiểm chứng

Các giá trị trong `db/migrations/002_auth_steps_data.sql` **đều khớp với source** – công của A chuẩn.

| Target | File trong SUT |
| --- | --- |
| `placeholder=e.g. 20521234` | `frontend/src/pages/LoginUI.jsx:236` |
| `placeholder=Enter your password` | `frontend/src/pages/LoginUI.jsx:254` |
| `text=Sign In` · `text=Sign in with Google` · `text=Forgot password` | `frontend/src/pages/LoginUI.jsx` |
| `placeholder=you@eiu.edu.vn` · `text=Send reset link` · `text=Check your inbox for a reset link` | `frontend/src/pages/ForgotPasswordUI.jsx` |
| `placeholder=Search by IRN, name or email` · `text=Add User` · `text=Suspend` | `frontend/src/components/UserTable.jsx` |
| `text=Create User` · `placeholder=Enter full name` | `frontend/src/components/UserModal.jsx` |

### Màn hình giảng viên (`/lecturer-solution`) – cho TC-23 → TC-27

| Nhãn thật trong SUT | Ghi chú |
| --- | --- |
| `MMD Relationships` | ⚠️ Ma trận TC-25 đang ghi **"MMD Relations"** – sai, thiếu chữ `hips` |
| `Operational Testcases` | Khớp TC-26 |
| `Create Lab` · `Lab name` · `Quarter` · `Create` · `Cancel` | Modal tạo lab (TC-23) |
| `Copy lab` · `Target quarter` | Chức năng ma trận chưa phủ |
| `Confirm delete` · `Delete` | Modal xóa (TC-23) |
| `Unsaved changes` | Modal cảnh báo – ma trận chưa phủ |

### Dashboard giảng viên – cho TC-28

Nhãn thẻ thống kê: `Total Submissions` · `Students Submitted` · `Average Score` · `Highest Score` · `Lowest Score` ·
`Completion Rate` · `Enrolled Students` · `Live` · `Hidden`

## 6. Thông báo lỗi – backend ≠ giao diện là CỐ Ý

Đây là điểm quan trọng nhất cần sửa trong tài liệu nhóm.

| Tầng | Chuỗi | Nguồn |
| --- | --- | --- |
| Backend trả về | `Invalid IRN or password` | `backend/src/main/java/service/UserService.java:267,270` |
| Giao diện hiển thị | `IRN or password is wrong` | `frontend/src/config/apiErrorMessages.js:16` |

**Không phải bug.** `frontend/src/utils/apiError.js` chỉ hiển thị message của backend cho các context nằm trong
`BACKEND_MESSAGE_CONTEXTS` – danh sách đó **không có `login`**. Với `login`, frontend map theo HTTP status:
`401` → `IRN or password is wrong`, `403` → `This account is inactive.`

→ Mục **D9** trong [`../database/phan-cong-db-va-du-lieu.md`](../database/phan-cong-db-va-du-lieu.md) đang lấy đúng cặp này làm
**ví dụ bug** – cần bỏ, và tìm ví dụ khác.

### Các thông báo khác đã xác minh

| Luồng | Chuỗi hiển thị |
| --- | --- |
| Login sai mật khẩu (401) | `IRN or password is wrong` |
| Tài khoản bị khóa (403) | `This account is inactive.` |
| Google OAuth lỗi (401/403) | `Unable to sign in with Google. Please try again.` |
| Google OAuth, tài khoản khóa (423) | `This account is inactive.` |
| Reset link hỏng / hết hạn | `This reset link is invalid or expired. Please request a new one.` |
| Đổi mật khẩu, sai mật khẩu cũ | `Current password is incorrect.` |
| Hết phiên | `Session expired. Please sign in again.` |
| Import solution quá lớn (413) | `This solution folder is too large to upload (limit 50MB).` |

## 7. Xác minh một số FR

| FR | Khẳng định trong tài liệu nhóm | Thực tế trong source | Kết luận |
| --- | --- | --- | --- |
| **FR-2** | Giới hạn domain Google OAuth `@eiu.edu.vn` | `allowed-domain: eiu.edu.vn` trong `backend/src/main/resources/application.yml:27`, chặn ở `GoogleTokenVerifier.java:79` | ✅ Đúng |
| **FR-4** | Token reset hiệu lực 15 phút | `app.password-reset.expiry-minutes` mặc định **15**, `PasswordResetService.java:54` | ✅ Đúng – nhưng là **cấu hình được**, bản deploy có thể đặt khác |
| **TC-04** | Giao diện "hiển thị thông báo yêu cầu domain `@eiu.edu.vn`" | Backend ném `Email domain is not allowed.` nhưng frontend **nuốt** và hiện `Unable to sign in with Google. Please try again.` | ❌ **Expected result trong ma trận sai** |

## 8. Tài liệu hữu ích trong repo SUT

| File | Nội dung |
| --- | --- |
| `docs/PROGRAM_REPORT.md` | Tổng quan đầy đủ: công nghệ, vai trò, 3 trụ cột, pipeline chấm, route, API, cấu trúc dự án |
| `docs/GRADING_WORKFLOWS.md` | Luồng chấm điểm |
| `docs/LECTURER_OPERATIONAL_TESTCASE_GUIDE.md` | Cách giảng viên cấu hình testcase vận hành – cho TC-26, TC-27 |
| `docs/USER_GUIDE.md`, `Student_Guide.pdf`, `Lecturer_Guide.pdf` | Hướng dẫn người dùng |
| `CONCEPTS.md` | Khái niệm nghiệp vụ |

> ⚠️ Repo SUT **không có tài liệu đánh số FR-1…FR-16 hay "Section 3.2.1"**. Cột `Source Reference` trong
> [`test-case-matrix.md`](./test-case-matrix.md) trỏ tới một tài liệu đặc tả **nằm ngoài cả hai repo** – cần xác định
> đó là tài liệu nào và lưu lại, nếu không thì cột đó không kiểm chứng được.
