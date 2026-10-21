# Kiến trúc hệ thống và Luồng dữ liệu

> **Nguồn:** hai file sơ đồ do thành viên chia sẻ, đã được giải mã và mô tả lại bằng chữ để đọc được trên GitHub mà không cần mở draw.io:
>
> - [`context-and-sequence-diagram.html`](./context-and-sequence-diagram.html) – Context Diagram (Page-1) + Sequence Diagram (Page-2). Mở trực tiếp bằng trình duyệt.
> - [`data-flow-capstone.drawio`](./data-flow-capstone.drawio) – DFD Level 0. Mở bằng [app.diagrams.net](https://app.diagrams.net) hoặc extension Draw.io trong VS Code.
>
> Khi sửa sơ đồ, **sửa file gốc rồi cập nhật lại phần mô tả bên dưới** để hai bên không lệch nhau.

## 1. Context Diagram – Test Manager & Automation Platform

Ranh giới hệ thống: nền tảng quản lý & chạy kiểm thử (repo này). Bên ngoài là người dùng và 3 hệ thống ngoài.

**Tác nhân (Users):** Admin · Tester · Viewer
→ gửi *View request*, *Test definition*, *Test run request*
← nhận *Dashboard, history, report*

**5 khối bên trong hệ thống:**

| # | Khối | Vai trò |
| :-: | --- | --- |
| 1 | **Front-end** | Render trang, hiển thị kết quả chấm, validate & error message. Gọi API kèm JWT. |
| 2 | **APIs (Back-end)** | Nhận request/response, CRUD dữ liệu, điều phối chạy test. |
| 3 | **Playwright** | Nhận *Run request*, thao tác trên website đích, trả *Live stdout* và screenshot. |
| 4 | **Logger** | Ghi Status, Duration, Error, Step, Screenshot về DB. |
| 5 | **Exporter** | Nhận *Report request*, trả báo cáo (PDF/HTML). |

**Kho dữ liệu:**

- **D1** – Users, Test, Results (CRUD + CRUD cho History).
- **D2** – Files không nằm trong D1 (screenshot, file đính kèm).

**Hệ thống ngoài (External Systems):**

| Hệ thống | Vào | Ra |
| --- | --- | --- |
| **OOP AutoGrader (Target)** | Auto UI request, usecase folders | Grading result, lab – data for testcases, new testcases |
| **Google OAuth** | OAuth request | OAuth result |
| **CI: GitHub Actions** | Trigger events & metadata | CI results & status, test results |

## 2. Sequence Diagram – Chạy một test case (TC-AUTH-005)

Các thành phần tham gia: **Tester** → **REST API** → **Test Runner (Playwright)** → **Test Automation DB** / **Browser** → **OOP AutoGrader** → **Result Reporter**.

```
Tester              REST API         Test Runner        Test Automation DB     Browser        OOP AutoGrader    Result Reporter
  │ Run TC-AUTH-005    │                   │                     │                │                 │                 │
  │  (from portal)     │                   │                     │                │                 │                 │
  ├───────────────────>│                   │                     │                │                 │                 │
  │                    │ spawn playwright test --grep TC-AUTH-005 │                │                 │                 │
  │                    ├──────────────────>│                     │                │                 │                 │
  │                    │                   │ loadTestCase("TC-AUTH-005")           │                 │                 │
  │                    │                   ├────────────────────>│                │                 │                 │
  │                    │                   │ test case + ordered steps + test data │                 │                 │
  │                    │                   │<────────────────────┤                │                 │                 │
  │                    │                   │   (env:KEY values resolved from .env) │                 │                 │
  │                    │                   │ NAVIGATE / FILL / CLICK               │                 │                 │
  │                    │                   ├──────────────────────────────────────>│                 │                 │
  │                    │                   │                     │                │ POST login       │                 │
  │                    │                   │                     │                │ (username, pwd)  │                 │
  │                    │                   │                     │                ├────────────────>│                 │
  │                    │                   │                     │                │ Error message page                 │
  │                    │                   │                     │                │<────────────────┤                 │
  │                    │                   │ DOM + screenshot    │                │                 │                 │
  │                    │                   │<──────────────────────────────────────┤                 │                 │
  │                    │                   │  VERIFY expected text from last step  │                 │                 │
  │                    │                   │ onTestEnd(status, duration, error, screenshot)          │                 │
  │                    │                   ├────────────────────────────────────────────────────────>│                 │
  │                    │                   │                     │ INSERT test_runs (browser, env, git commit)         │
  │                    │                   │                     │<────────────────────────────────────────────────────┤
  │                    │                   │                     │ INSERT test_results per TC                          │
  │                    │                   │                     │<────────────────────────────────────────────────────┤
  │                    │                   │                     │ INSERT test_evidences (screenshot path)             │
  │                    │                   │                     │<────────────────────────────────────────────────────┤
  │                    │ exit code         │                     │                │                 │                 │
  │                    │<──────────────────┤                     │                │                 │                 │
  │ run finished, results in DB            │                     │                │                 │                 │
  │<───────────────────┤                   │                     │                │                 │                 │
  │ npm run report:db  │                   │                     │                │                 │                 │
  ├────────────────────────────────────────────────────────────────────────────────────────────────────────────────── │
  │ PDF report of latest run                                                                                           │
  │<────────────────────────────────────────────────────────────────────────────────────────────────────────────────── │
```

**Điểm cần nhớ:** bí mật (`env:KEY`) chỉ được **phân giải lúc chạy** từ `.env`, không bao giờ nằm trong Test Automation DB.

## 3. DFD Level 0 – OOP AutoGrader

**Tác nhân ngoài:** User (Admin, Tester, Dev, Viewer) · CI/CD System · Target Website.

**5 tiến trình:**

| # | Tiến trình | Vào | Ra |
| :-: | --- | --- | --- |
| 1.0 | Authenticate & Authorize | Login / Credentials | Auth success |
| 2.0 | Manage Project & Test Cases | Test Case Data / CRUD Request | Operation Status / Test Case Details |
| 3.0 | Orchestrate & Execute Tests | Test Run Request, API Trigger / Token | Automation Commands & Script Payload → Target Website |
| 4.0 | Process Test Results | Raw Execution Logs, Execution Logs & Step Status, DOM Elements & Page State | Processed Test Results |
| 5.0 | Generate & Display Reports | Report Query, Test Result Data | Visual Reports & Dashboard Data, Execution Status & Summary |

**4 kho dữ liệu:**

| Kho | Nội dung |
| --- | --- |
| **D1** | Users & RBAC |
| **D2** | Projects & TestCases |
| **D3** | TestRuns & Steps |
| **D4** | Evidence Screenshots |

## 4. Đối chiếu sơ đồ / SRS với hiện trạng code

**Nguyên tắc giải quyết mâu thuẫn (nhóm chốt 17/10/2026):**

| Chủ đề | Nguồn chuẩn |
| --- | --- |
| Kiến trúc, yêu cầu chức năng, công nghệ, vai trò người dùng | [`SRS.md`](./SRS.md) |
| Cấu trúc bảng, tên bảng, tên cột, kiểu dữ liệu, ENUM | `db/schema/test_automation_db_schema.sql` |

Tài liệu khác (kể cả [`../backend/backend-design.md`](../backend/backend-design.md)) và code hiện tại **phải theo hai nguồn trên**.
Chỗ nào lệch thì đó là **việc còn phải làm**, không phải lý do sửa SRS hay schema.

⚠️ **Cả hai nguồn chuẩn đều sẽ được sửa về sau.** Khi nhóm chốt lại một quyết định thì **quyết định mới của nhóm được ưu tiên**:
sửa file nguồn chuẩn trước, rồi cập nhật các tài liệu phụ thuộc và bảng dưới đây.

| # | Chủ đề | Nguồn chuẩn nói | Code hiện tại | Kết luận |
| :-: | --- | --- | --- | --- |
| 1 | **Lưu trữ** | **SRS:** Supabase (PostgreSQL) + Supabase Storage Buckets (D4) | **MySQL/InnoDB**, kết nối qua `mysql2` | **Theo SRS → đích là Supabase.** Code và `backend-design.md` là hiện trạng tạm. Việc phải làm: chuyển `db/schema/` + migration sang PostgreSQL, đổi client. Nếu nhóm thấy không khả thi thì **đổi SRS trước**, đừng để hai bên lệch tiếp. |
| 2 | **Vai trò người dùng** | **SRS mục 4 + schema:** 4 vai trò – Admin / QA-Tester / Developer / Viewer, `ENUM('admin','tester','dev','viewer')`. DFD Level 0 cũng vẽ 4 vai trò. | Schema có đủ 4; `frontend/src/models/permissions.js` xếp `Dev` vào `WRITE_ROLES` (ngang Tester) | **Giữ 4 vai trò.** Đảo lại đề xuất bỏ `dev` ở `backend-design.md` mục 6. Việc phải làm: định nghĩa quyền `dev` đúng SRS (xem kết quả/log/bằng chứng + **được request chạy lại**, không được tạo/sửa/xóa) rồi sửa `permissions.js`. |
| 3 | **Tên bảng, tên cột** | **Schema:** `snake_case` chữ thường – `test_suites`, cột `suite_description` | `db/seed/seed.sql` và `db/migrations/001`, `002` dùng `Test_Suites`, `Test_Cases` (chữ hoa) và cột `description`; `004` dùng chữ thường | **Theo schema.** `seed.sql` và migration `001`, `002` đang sai → chạy trên MySQL/Linux sẽ lỗi. Việc phải làm: sửa seed và hai migration đó về chữ thường và `suite_description`. |
| 4 | **Nơi chạy test** | **SRS mục 7.6:** hỗ trợ chạy thủ công / theo lịch / qua API–CI/CD | Chạy bằng **GitHub Actions** (`workflow_dispatch`); Vercel serverless không chạy được Playwright | **Không mâu thuẫn** – GitHub Actions là cách hiện thực hóa mục 7.6. Việc phải làm: Context Diagram nên vẽ Playwright **ngoài** ranh giới hệ thống, cạnh khối CI. |
| 5 | **Realtime** | **SRS mục 7.7:** hiển thị tiến độ và Process Steps Report | Context Diagram ghi *Live stdout*; Vercel cắt kết nối mở lâu | Dùng **polling** `GET /runs/:id/logs?after=<seq>`; SSE chỉ khi chạy local. Không ảnh hưởng SRS. |
| 6 | **Bug_Feedbacks** | DFD nhắc tới qua tiến trình 4.0; SRS **không** có yêu cầu báo lỗi trong phạm vi MVP (mục 3.1) | Bảng `bug_feedbacks` **đang bị comment** trong schema | Ngoài phạm vi MVP. Bật bảng khi làm mục D9 trong [`../database/phan-cong-db-va-du-lieu.md`](../database/phan-cong-db-va-du-lieu.md), hoặc bổ sung yêu cầu vào SRS trước. |
