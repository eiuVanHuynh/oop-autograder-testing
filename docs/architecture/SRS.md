# ĐẶC TẢ YÊU CẦU SẢN PHẨM (SRS)

## OOP AUTOGRADER: AUTOMATED TESTING SYSTEM

- **Tên dự án:** OOP AutoGrader: Automated Testing System
- **Phiên bản:** 1.0
- **Trạng thái:** Bản hoàn chỉnh cho MVP (Sản phẩm khả dụng tối thiểu)
- **Mô hình kiến trúc:** MVC (Model - View - Controller)
- **Công nghệ cốt lõi:**
  - **View (Giao diện):** JavaScript (Frontend) - Triển khai trên Vercel
  - **Controller (Bộ điều khiển):** Node.js (Backend / API) - Triển khai trên Vercel
  - **Model (Dữ liệu & Lưu trữ):** Cloud Supabase - Quản lý thiết kế qua DBeaver

---

> ### 📌 Ghi chú biên tập (17/10/2026)
>
> **File này là NGUỒN CHUẨN về kiến trúc và yêu cầu của nền tảng.** Khi tài liệu khác (kể cả
> [`../backend/backend-design.md`](../backend/backend-design.md)) hoặc code hiện tại nói khác, **SRS thắng** –
> phần khác là việc còn phải làm, không phải lý do để sửa SRS.
> Nguồn chuẩn về **cấu trúc DB** là `db/schema/test_automation_db_schema.sql`.
>
> ⚠️ Cả hai nguồn chuẩn này **đều sẽ được sửa về sau**. Khi nhóm chốt lại một quyết định thì **quyết định mới của nhóm
> được ưu tiên**; sửa file nguồn chuẩn trước, rồi cập nhật các tài liệu phụ thuộc.
>
> 1. **Phạm vi:** SRS này đặc tả **nền tảng test automation của repo này**. Đừng nhầm với yêu cầu chức năng của
>    **hệ thống cần kiểm thử (SUT)** – website OOP AutoGrader – nằm ở [`../testing/fr-mapping.md`](../testing/fr-mapping.md)
>    và [`../testing/test-plan.md`](../testing/test-plan.md).
> 2. **Lưu trữ – hướng chuẩn là Supabase (PostgreSQL) + Supabase Storage** như mục 2 bên dưới.
>    Code hiện tại là **MySQL/InnoDB** (`db/schema/…`, truy cập qua `mysql2`) và `backend-design.md` cũng viết theo MySQL
>    → đây là **khoảng cách cần thu hẹp**, không phải lỗi của SRS. Trước khi chuyển, nhóm cần một quyết định rõ ràng
>    (ghi lại ở đâu đó trong `docs/`), vì nó kéo theo `db/schema/`, toàn bộ migration và `mysql2` → client PostgreSQL.
> 3. **Cơ chế chạy test:** SRS mô tả Controller trên Vercel kích hoạt runner. Vercel serverless **không chạy được Playwright**
>    → `backend-design.md` đã chốt chạy qua **GitHub Actions** (`workflow_dispatch`). Đây là *cách hiện thực hóa* mục 7.6,
>    không mâu thuẫn với SRS; nếu muốn SRS ghi rõ thì bổ sung vào mục 2.
> 4. **Vai trò người dùng – giữ 4 vai trò** theo SRS mục 4 (Admin / QA-Tester / Developer / Viewer), khớp với
>    `db/schema/` (`ENUM('admin','tester','dev','viewer')`) và với DFD Level 0.
>    ⚠️ Điều này **đảo lại** đề xuất ở `backend-design.md` mục 6 (bỏ `dev`, gộp vào `viewer`). Việc còn phải làm:
>    định nghĩa rõ quyền của `dev` (SRS mục 4: xem kết quả, log, chuỗi bước, bằng chứng và **được request chạy lại**)
>    rồi sửa `frontend/src/models/permissions.js` – chỗ này đang xếp `Dev` ngang `Tester`, rộng hơn SRS cho phép.
>
> Xem bảng đối chiếu đầy đủ ở [`kien-truc-va-luong-du-lieu.md`](./kien-truc-va-luong-du-lieu.md) mục 4.

---

# PHẦN 1: TIẾNG VIỆT

## 1. TỔNG QUAN

**OOP AutoGrader: Automated Testing System** là nền tảng kiểm thử tự động website cho phép đội ngũ nội bộ tạo, quản lý và thực thi các kịch bản kiểm thử trên website mục tiêu. Hệ thống áp dụng nghiêm ngặt mô hình **MVC (Model - View - Controller)**:

- **View:** Giao diện **JavaScript Frontend** chạy trên trình duyệt người dùng.
- **Controller:** Xử lý nghiệp vụ phía **Node.js Backend**.
- **Model:** Lưu trữ dữ liệu và tệp bằng chứng trên **Cloud Supabase**, được quản lý thiết kế thông qua **DBeaver**.

Hệ thống yêu cầu đăng nhập, phân quyền, hỗ trợ chạy test thủ công/theo lịch, tích hợp CI/CD và đặc biệt lưu trữ toàn diện bằng chứng (ảnh chụp màn hình) cho **mọi test case (cả Pass và Fail)** để hiển thị chi tiết dưới dạng báo cáo quy trình bước thực thi (Process Steps Report).

---

## 2. KIẾN TRÚC MÔ HÌNH MVC VÀ CÔNG NGHỆ

- **Model (Mô hình dữ liệu & Lưu trữ):** Sử dụng cơ sở dữ liệu DBeaver trên **Cloud Supabase**, quản lý và tối ưu hóa câu lệnh truy vấn qua **DBeaver**. Nhiệm vụ định nghĩa cấu trúc bảng (Users, Projects, TestCases, TestRuns, TestSteps, Evidence....), xử lý ràng buộc dữ liệu và lưu trữ file ảnh chụp màn hình bằng chứng lên **Supabase Storage Buckets**.
- **View (Giao diện người dùng):** Sử dụng **JavaScript**, HTML5, CSS3, triển khai hosting trên **Vercel**. Nhiệm vụ hiển thị trực quan giao diện trang quản lý dự án.
- **Controller (Bộ điều khiển logic nghiệp vụ):** Sử dụng **Node.js** (Express.js / Serverless Functions), triển khai trên **Vercel**. Nhiệm vụ tiếp nhận request từ View, điều phối logic phân quyền (RBAC), kích hoạt worker thực thi automation test, xử lý đối chiếu kết quả và giao tiếp với Model để đọc/ghi dữ liệu.

---

## 3. PHẠM VI SẢN PHẨM

### 3.1. Bao gồm trong MVP

- Xây dựng kiến trúc MVC hoàn chỉnh: View (JS Frontend), Controller (Node.js), Model (Supabase & DBeaver).
- Quản lý dự án, môi trường (Dev/Staging/Prod) và website mục tiêu.
- Tạo test case bằng biểu mẫu, ghi thao tác trên trình duyệt, chỉnh sửa và phát lại các bước.
- Chạy test thủ công.
- Tự động chụp ảnh màn hình (Evidence) cho **mọi** test case (cả Pass và Fail) và lưu trữ lên Supabase Storage.
- Hiển thị báo cáo quy trình bước thực thi trực quan trên giao diện JavaScript Frontend: Tester name, expected value, actual value, lỗi chi tiết,...
- Triển khai ứng dụng lên **Vercel** và cơ sở dữ liệu trên **Cloud Supabase**.

### 3.2. Chưa thuộc phạm vi MVP

Kiểm thử tải quy mô lớn, ứng dụng di động gốc, vượt CAPTCHA, AI tự sửa kịch bản.

---

## 4. NGƯỜI DÙNG VÀ VAI TRÒ

| Vai trò                   | Quyền chính                                                                                         |
| ------------------------- | --------------------------------------------------------------------------------------------------- |
| **Quản trị viên (Admin)** | Quản lý người dùng, vai trò, dự án, cấu hình hệ thống và chính sách dữ liệu trên Supabase           |
| **QA / Tester**           | Tạo, chỉnh sửa, chạy và xem test; kiểm tra báo cáo quy trình bước thực thi và evidence ảnh màn hình |
| **Developer**             | Xem kết quả, log, chuỗi bước chi tiết và bằng chứng hình ảnh; có thể request chạy lại               |
| **Người xem (Viewer)**    | Chỉ xem dự án, test case và báo cáo được cấp quyền                                                  |

---

## 5. THUẬT NGỮ

- **MVC:** Mô hình kiến trúc phần mềm gồm Model (Dữ liệu/Supabase), View (Giao diện/JS Frontend), Controller (Logic/Node.js).
- **Test run:** Một lượt thực thi test case do Node.js Controller xử lý.
- **Evidence:** Ảnh chụp màn hình (screenshot) lưu trên Supabase Storage cho mọi test case (Pass/Fail).
- **Process Steps Report:** Báo cáo dạng quy trình trên View hiển thị automation test đã làm gì, thực hiện thế nào, ai thực hiện (`Tester name`) và sai lệch cụ thể ở đâu.

---

## 6. LUỒNG TƯƠNG TÁC MVC

1. **Người dùng (View - JS Frontend trên Vercel)** gửi yêu cầu tạo hoặc chạy test case.
2. **Bộ điều khiển (Controller - Node.js trên Vercel)** tiếp nhận request, kiểm tra phân quyền, điều phối logic thực thi (gọi test runner worker).
3. **Bộ điều khiển (Controller)** giao tiếp với **Model (Cloud Supabase Database quản lý qua DBeaver)** để lưu/đọc dữ liệu cấu hình và trạng thái.
4. Sau khi chạy xong, Node.js Controller tự động chụp ảnh màn hình, lưu file lên **Supabase Storage (Model)** và ghi nhận kết quả chi tiết.
5. **Giao diện (View)** truy vấn dữ liệu từ Controller/Model để hiển thị **Process Steps Report** và **Evidence Gallery** cho người dùng.

---

## 7. YÊU CẦU CHỨC NĂNG

### 7.1. Tài khoản và phân quyền

Hệ thống phải:

- Yêu cầu đăng nhập trước khi truy cập chức năng nội bộ.
- Hỗ trợ đăng nhập, đăng xuất và đặt lại mật khẩu theo chính sách nội bộ.
- Cho phép quản trị viên tạo, khóa hoặc thu hồi quyền người dùng.
- Phân quyền truy cập theo dự án.
- Ghi nhận người tạo, người sửa và người chạy test (`Tester name` / `Runner`).
- Ngăn người dùng truy cập dữ liệu ngoài phạm vi được cấp quyền.

### 7.2. Quản lý dự án và môi trường

Mỗi dự án cần có:

- Tên dự án, mô tả, URL website mục tiêu, môi trường, thành viên và vai trò.
- Mỗi môi trường lưu trữ Base URL, cấu hình trình duyệt, biến môi trường và thông tin đăng nhập bảo mật.
- Hệ thống phải cảnh báo trước khi chạy test trên Production.

### 7.3. Tạo và quản lý test case

Mỗi test case cần có các trường chuẩn:

- **Tên test:** Tên ngắn, thể hiện mục đích kiểm thử.
- **Yêu cầu/mục đích kiểm thử:** Chức năng hoặc yêu cầu cần xác minh.
- **Dự án & Môi trường:** Dự án chứa test và môi trường áp dụng.
- **Người tạo & Người phụ trách:** Lấy từ tài khoản đăng nhập hoặc thành viên được phân công.
- **Tiền điều kiện & Dữ liệu đầu vào:** Điều kiện trước khi chạy và dữ liệu dùng trong kịch bản.
- **Các bước thao tác & Kết quả mong đợi:** Danh sách thao tác và điều kiện xác định test thành công.
- **Nhãn/độ ưu tiên & Trạng thái:** Phục vụ lọc, sắp xếp và quản lý vòng đời (Draft, Ready, Archived).

### 7.4. Ghi thao tác trên trình duyệt

Hỗ trợ ghi và chỉnh sửa các thao tác phổ biến trên website mục tiêu:

- Mở URL hoặc chuyển trang, nhấn nút hoặc liên kết.
- Nhập, xóa hoặc chọn giá trị trong trường biểu mẫu, dropdown, checkbox hoặc radio button.
- Chờ phần tử xuất hiện hoặc trang tải xong.
- Kiểm tra URL, phần tử hiển thị/không hiển thị, nội dung văn bản hoặc giá trị trường.
- Cho phép chỉnh sửa, sắp xếp lại bước, chạy thử và xác định bước thành công/thất bại.

### 7.5. Đăng nhập vào website mục tiêu

- Lưu trữ thông tin đăng nhập dưới dạng mã hóa bảo mật tuyệt đối.
- Không ghi mật khẩu, OTP, cookie, token hoặc bí mật vào log, ảnh hoặc báo cáo.

### 7.6. Thực thi test

Hệ thống phải:

- Cho phép chạy một test, nhiều test hoặc toàn bộ test được chọn (thủ công, theo lịch, hoặc qua API/CI/CD).
- Hiển thị trạng thái vòng đời: `Queued`, `Running`, `Passed`, `Failed`, `Canceled`, hoặc `Error`.
- Hỗ trợ hủy lượt chạy, giới hạn thời lượng tối đa, thử lại lỗi tạm thời và tách biệt phiên trình duyệt giữa các lượt chạy.

### 7.7. Kết quả, Bằng chứng (Evidence) và Báo cáo quy trình bước thực thi (Process Steps Report)

Mỗi lượt chạy test case phải lưu trữ chi tiết và hiển thị rõ ràng trên giao diện báo cáo:

- **Thông tin chung:** Tên test, phiên bản, người thực hiện (`Tester/Runner name`), môi trường, thời gian bắt đầu, kết thúc, tổng thời lượng và trạng thái tổng thể (`Passed`/`Failed`).
- **Quy trình các bước thực thi (Process Steps Visualization):**
  - Hiển thị trực quan toàn bộ chuỗi bước thao tác giống như sơ đồ quy trình minh chứng hệ thống đã làm gì và test thế nào.
  - Mỗi bước thể hiện rõ: Tên thao tác, trạng thái bước (`Pass`/`Fail`), **Expected value** (Giá trị kỳ vọng), và **Actual value** (Giá trị thực tế).
  - **Định vị lỗi chi tiết (Error Details):** Nếu bước bị lỗi (`Fail`), báo cáo chỉ ra chính xác sai ở đâu, thông điệp lỗi cụ thể (Error message) hoặc phần tử không khớp giúp QA/Developer nắm bắt nhanh chóng.
- **Hệ thống lưu trữ Bằng chứng (Evidence Gallery):**
  - Tự động chụp và lưu ảnh màn hình (`Screenshot`) cho **mọi test case** sau khi hoàn thành, áp dụng cho **cả trường hợp Pass lẫn Fail**.
  - Gắn kết trực quan hình ảnh chụp màn hình tương ứng với từng bước thao tác hoặc mốc thời điểm quan trọng.
- **Log hệ thống:** Nhật ký thực thi chi tiết đã được lược bỏ thông tin nhạy cảm.

### 7.8. Thông báo

- Hỗ trợ thông báo trong ứng dụng khi lượt chạy hoàn tất, thất bại, vượt thời gian hoặc lỗi lịch chạy.
- Có thể mở rộng tích hợp email, Slack, Teams.

### 7.9. Tích hợp CI/CD

Hỗ trợ kích hoạt test qua API bằng token bảo mật có phân quyền, giới hạn phạm vi, ghi nhận thời điểm sử dụng và nhận webhook khi lượt chạy hoàn tất.---

## 8. CHÍNH SÁCH LƯU TRỮ DỮ LIỆU

| Loại dữ liệu                                            | Thời gian lưu mặc định | Vị trí lưu trữ trong MVC        |
| ------------------------------------------------------- | ---------------------- | ------------------------------- |
| **Kết quả chạy & Log hệ thống**                         | 90 ngày                | Model (Supabase Cloud Database) |
| **Ảnh chụp màn hình bằng chứng (Pass & Fail Evidence)** | 30 ngày                | Model (Supabase Cloud Storage)  |
| **Lịch sử thay đổi Test case & Audit Logs**             | 180 ngày               | Model (Supabase Cloud Database) |

---

# PHẦN 2: TIẾNG ANH

# PRODUCT REQUIREMENTS SPECIFICATION (SRS)

OOP AUTOGRADER: AUTOMATED TESTING SYSTEM

- **Project Name:** OOP AutoGrader: Automated Testing System
- **Version:** 1.0
- **Status:** Complete Specification for MVP (Minimum Viable Product)
- **Architectural Pattern:** MVC (Model - View - Controller)
- **Core Tech Stack:**
  - **View (User Interface):** JavaScript (Frontend) - Deployed on Vercel
  - **Controller (Business Logic):** Node.js (Backend / API) - Deployed on Vercel
  - **Model (Data & Storage):** Cloud Supabase - Designed and managed via DBeaver

---

## 1. OVERVIEW

OOP AutoGrader: Automated Testing System is an automated website testing platform that enables internal teams to create, manage, and execute test scripts on target websites. The system strictly follows the MVC (Model - View - Controller) architectural pattern:

- **View:** JavaScript Frontend user interface running on client browsers.
- **Controller:** Node.js Backend business logic handler.
- **Model:** Data and evidence file storage on Cloud Supabase, designed and managed via DBeaver.

The system requires user authentication, role-based access control (RBAC), supports manual/scheduled test executions, CI/CD integration, and comprehensively stores screenshot evidence for all test cases (both Pass and Fail) to display detailed step-by-step process reports (Process Steps Report).

---

## 2. MVC ARCHITECTURE AND TECH STACK

- **Model (Data & Storage Layer):** Uses a PostgreSQL database on Cloud Supabase, managed and optimized via DBeaver. Responsibilities include defining database schemas (Users, Projects, TestCases, TestRuns, TestSteps, Evidence, etc.), handling data constraints, and storing screenshot evidence files on Supabase Storage Buckets.
- **View (User Interface Layer):** Built with JavaScript, HTML5, CSS3, deployed and hosted on Vercel. Responsible for rendering intuitive project management dashboards.
- **Controller (Business Logic Layer):** Built with Node.js (Express.js / Serverless Functions), deployed on Vercel. Responsibilities include processing requests from the View, coordinating access control logic (RBAC), triggering automation runner workers, handling assertion processing, and interacting with the Model for data persistence.

---

## 3. PRODUCT SCOPE

### 3.1. In Scope for MVP

- Complete MVC implementation: View (JS Frontend), Controller (Node.js), Model (Supabase & DBeaver).
- Management of projects, test environments (Dev/Staging/Prod), and target website configurations.
- Form-based test case creation, browser interaction recording, step editing, and replay.
- Manual test execution.
- Automated screenshot evidence capture for all test cases (both Pass and Fail) stored on Supabase Storage.
- Visual process steps report rendered on the JavaScript Frontend: Tester name, expected value, actual value, granular error breakdown, etc.
- Application deployment on Vercel and cloud database on Cloud Supabase.

### 3.2. Out of Scope for MVP

Large-scale load testing, native mobile apps, CAPTCHA bypassing, AI self-healing scripts.

---

## 4. USERS AND ROLES

| Role            | Primary Permissions                                                                         |
| --------------- | ------------------------------------------------------------------------------------------- |
| **Admin**       | Manage users, roles, projects, system configurations, and Supabase data policies            |
| **QA / Tester** | Create, edit, execute, and view tests; inspect process step reports and screenshot evidence |
| **Developer**   | View test results, logs, step workflows, and evidence; trigger re-runs                      |
| **Viewer**      | Read-only access to assigned projects, test cases, and reports                              |

---

## 5. GLOSSARY

- **MVC:** Architectural pattern comprising Model (Data/Supabase), View (Interface/JS Frontend), Controller (Logic/Node.js).
- **Test run:** An instance of test execution processed by the Node.js Controller.
- **Evidence:** Execution evidence screenshots hosted on Supabase Storage for all Pass/Fail scenarios.
- **Process Steps Report:** Workflow report on the View showing execution details, runner (`Tester name`), and exact failure points.

---

## 6. MVC INTERACTION WORKFLOW

1. User (View - JS Frontend on Vercel) initiates a test creation or execution request.
2. Controller (Node.js on Vercel) receives the request, enforces access control, and coordinates execution logic (invokes test runner worker).
3. Controller interacts with the Model (Cloud Supabase Database managed via DBeaver) to persist and query configuration/status data.
4. Post-execution, the Node.js Controller automatically captures screenshots, uploads files to Supabase Storage (Model), and records detailed results.
5. User Interface (View) queries data from the Controller/Model to render the Process Steps Report and Evidence Gallery for the user.

---

## 7. FUNCTIONAL REQUIREMENTS

### 7.1. Authentication and Access Control

The system must:

- Require user authentication before accessing internal functions.
- Support login, logout, and password resets according to internal policies.
- Allow administrators to create, block, or revoke user privileges.
- Enforce project-level access control.
- Log explicitly the user who created, modified, or executed each test (`Tester name` / `Runner`).
- Prevent users from accessing data outside their authorized scope.

### 7.2. Project and Environment Management

Each project requires:

- Project name, description, target website URL, environments, members, and roles.
- Each environment stores the Base URL, browser configurations, environment variables, and secure login credentials.
- The system must display a warning prompt before executing tests on Production.

### 7.3. Test Case Creation and Management

Each test case requires standard fields:

- **Test Name:** Short title indicating the testing objective.
- **Test Objective:** Functionality or requirement to verify.
- **Project & Environment:** Associated project and target environment.
- **Author & Assignee:** Derived from the logged-in account or assigned member.
- **Prerequisites & Input Data:** Pre-conditions and scenario-specific data.
- **Action Steps & Expected Results:** Action sequence and criteria for test success.
- **Labels/Priority & Status:** Used for filtering, sorting, and lifecycle management (Draft, Ready, Archived).

### 7.4. Browser Interaction Recording

Support recording and editing common browser interactions on target websites:

- Navigate URLs or switch pages, click buttons or links.
- Type, clear, or select values in form fields, dropdowns, checkboxes, or radio buttons.
- Wait for elements to appear or page loading to complete.
- Assert URLs, element visibility/invisibility, text content, or field values.
- Allow reordering steps, editing, trial execution, and status determination (Pass/Fail).

### 7.5. Target Website Authentication

- Securely encrypt and store login credentials.
- Never expose passwords, OTPs, cookies, tokens, or secrets in logs, screenshots, or reports.

### 7.6. Test Execution

The system must:

- Support manual, scheduled, or API/CI/CD triggered executions for single, multiple, or all selected tests.
- Display lifecycle statuses: `Queued`, `Running`, `Passed`, `Failed`, `Canceled`, or `Error`.
- Support execution cancellation, maximum duration limits, transient error retries, and browser session isolation across runs.

### 7.7. Results, Evidence, and Process Steps Report

Each test run must store detailed execution data and clearly display it on the report interface:

- **Overview Header:** Test name, version, runner (`Tester/Runner name`), environment, start/end timestamps, total duration, and overall status (`Passed`/`Failed`).
- **Process Steps Visualization:**
  - Visually display the complete sequence of actions as a flowchart proving what the system did and how it tested.
  - Each step clearly shows: Action name, step status (`Pass`/`Fail`), **Expected value**, and **Actual value**.
  - **Error Details:** If a step fails (`Fail`), the report points out the exact failure location, error message, or unmatched element to help QAs/Developers quickly grasp the root cause.
- **Evidence Gallery:**
  - Automatically capture and store screenshots for every test case upon completion, applied to **both Pass and Fail** cases.
  - Visually bind screenshots to corresponding action steps or key timestamps.
- **System Logs:** Detailed execution logs stripped of sensitive information.

### 7.8. Notifications

- Support in-app notifications upon test run completion, failure, timeout, or scheduling errors.
- Extensible integration options for email, Slack, and Teams.

### 7.9. CI/CD Integration

Support triggering tests via API using permission-scoped security tokens with rate/scope limits, usage logging, and webhook callbacks upon test completion.

---

## 8. DATA RETENTION POLICY

| Data Type                              | Default Retention | MVC Storage Layer               |
| -------------------------------------- | ----------------- | ------------------------------- |
| **Execution Results & System Logs**    | 90 days           | Model (Supabase Cloud Database) |
| **Evidence Screenshots (Pass & Fail)** | 30 days           | Model (Supabase Cloud Storage)  |
| **Test Case History & Audit Logs**     | 180 days          | Model (Supabase Cloud Database) |
