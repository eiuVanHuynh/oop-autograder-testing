# Explain – `docs/backend/`

**Nội dung:** thiết kế của **backend dashboard trong repo này** (`backend/` ở repo root) – API phục vụ giao diện quản lý test.

> ⚠️ Không phải backend của website OOP AutoGrader. Backend đó là **đối tượng bị kiểm thử** và không có code trong repo này – xem [`../database/phan-biet-cac-loai-database.md`](../database/phan-biet-cac-loai-database.md) mục 4.

## File trong thư mục

| File | Là gì | Dùng khi |
| --- | --- | --- |
| [`backend-design.md`](./backend-design.md) | Chọn công nghệ, luồng chạy test qua GitHub Actions, cấu trúc thư mục `backend/src/`, quy ước request/response, secrets, thay đổi DB cần có, thứ tự làm | Trước khi viết dòng code backend đầu tiên |
| [`api-endpoints.md`](./api-endpoints.md) | Danh sách endpoint theo 11 nhóm chức năng, kèm quyền hạn, status code và giải thích thuật ngữ cho người mới | Khi code controller, hoặc khi frontend cần biết gọi API nào |

## Những điều đã chốt

- **Node.js (CommonJS) + Express**, deploy API lên **Vercel**; DB là **PostgreSQL / Supabase** (xem bằng DBeaver) – khớp SRS.
- **Chạy test bằng GitHub Actions** (`workflow_dispatch`) – Vercel serverless không chạy được Playwright.
- **Log real-time dùng polling** `GET /runs/:id/logs?after=<seq>`, không dùng WebSocket.
  SSE dự kiến cho bản chạy local **chưa làm**, và phần vỏ controller đã bị xoá (nó chỉ có thể trả 500 vì
  `runs.service.js` không có `streamRunLogs`). Muốn làm: viết service trước, rồi khai route. Cùng tình trạng:
  `DELETE /runs/:id`. Xem [`api-endpoints.md`](./api-endpoints.md) mục 6, hai dòng ⚪.
- **Trạng thái một lần chạy được tính ra** từ dữ liệu có sẵn, không lưu cột `run_status` riêng.
- **Token reset mật khẩu không lưu trong DB** – JWT hạn 15 phút, ký kèm một phần `password_hash` hiện tại.
- **Dùng Template để chạy target test** *(nhóm chốt lại, thay cho Suite)*. Template nằm ở **bảng mới** `test_templates`, cột `target_json` trỏ tới `{ suiteId }` hoặc `{ testIds }`. Backend sinh biểu thức `--grep` từ đó. `test_suites` → `test_specs` → `test_cases` vẫn là nơi khai báo test. Xem [`backend-design.md`](./backend-design.md) mục 7.
- **Bảng đã thêm sau schema gốc (4 bảng, tất cả đã áp bằng migration, không nằm trong `db/schema/`)**:
  `test_templates` + 2 cột `test_runs.run_name` / `config_json` (`008_dashboard_runs_templates.sql`),
  `run_logs` (`008`), `bugs` (`013_bugs.sql`), `rerun_requests` (`016_rerun_requests.sql`).
  Tổng DB hiện có **17 bảng** – xem [`../report-fact-sheet.md`](../report-fact-sheet.md) mục 1.
- Mọi endpoint bắt đầu bằng `/api`. Response: `{ data, meta? }` · Lỗi: `{ error: { code, message, details? } }`.
- Phân quyền chặn ở **cả FE (ẩn nút) lẫn BE (trả 403)**. Chỉ ẩn nút là chưa đủ.

## ⚠️ Chỗ `backend-design.md` không còn đúng

Nguồn chuẩn là [`../architecture/SRS.md`](../architecture/SRS.md) (kiến trúc, vai trò) và `db/schema/` (cấu trúc DB) –
xem [`../GIT_WORKFLOW.md`](../GIT_WORKFLOW.md) mục 9. Hai điểm trong `backend-design.md` đi ngược lại:

| Mục | `backend-design.md` viết | Theo nguồn chuẩn |
| --- | --- | --- |
| 6 – "Role `dev` = Viewer" | Bỏ `dev` khỏi ENUM, gộp vào `viewer` | **Giữ 4 vai trò.** SRS mục 4 và `db/schema/` đều có `dev` (Developer). Cần định nghĩa quyền `dev` cho đúng, không xóa. |

*(Điểm MySQL đã hết: mục 1 nay ghi PostgreSQL/Supabase, khớp SRS. Code `backend/` thì vẫn cần chuyển.)*

Phần còn lại của `backend-design.md` (luồng GitHub Actions, polling, cấu trúc thư mục, quy ước response) vẫn còn hiệu lực.

## Những điều CHƯA chốt

✅ Ba điểm trước đây để mở nay **đã xong**, giữ lại để ai đọc tài liệu cũ khỏi làm lại:
- *Chuyển code `backend/` sang Postgres/Supabase* – xong, `backend/` dùng driver `pg`, không còn MySQL.
- *Thời điểm chạy migration tạo `test_templates`* – xong, nằm trong `008` và đã có trong danh sách của `migrate.js`.
- *Quyền của vai trò `dev`* – chốt ở issue **#97**: Dev **không** chạy test, kể cả chạy lại. Dev gửi yêu cầu
  (`POST /runs/:id/rerun-requests`), Admin/Tester duyệt, và **duyệt không tự chạy test**.
  Xem [`api-endpoints.md`](./api-endpoints.md) mục 6 và Phụ lục A.

Còn mở: nhóm endpoint `/stats` và `/reports` (mục 3 và 7 của `api-endpoints.md`) chưa viết dòng code nào –
Dashboard hiện tự tính số liệu từ `GET /runs`.

## Quy tắc bảo trì

- Hai file này phải **khớp nhau**: thêm endpoint vào `api-endpoints.md` thì kiểm tra `backend-design.md` mục 6 xem có cần thay đổi DB không, và ngược lại.
- Mỗi endpoint phải ghi rõ **quyền hạn** và **status code** – đây là thứ frontend và người viết test dựa vào.
- Ưu tiên: 🔴 Cần thiết · 🟡 Tiềm năng. Khi làm xong một endpoint 🟡 thì cập nhật lại độ ưu tiên.
- Ma trận phân quyền ở Phụ lục A của `api-endpoints.md` phải khớp với [`../frontend/03-yeu-cau-giao-dien-v3.md`](../frontend/03-yeu-cau-giao-dien-v3.md) và `frontend/src/models/permissions.js`.
