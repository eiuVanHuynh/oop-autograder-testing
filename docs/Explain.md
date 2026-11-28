# Explain – Thư mục `docs/`

Toàn bộ tài liệu của repo **oop-autograder-testing**. Mỗi thư mục con đều có một `Explain.md` riêng mô tả chi tiết.

## Trước tiên: phân biệt 2 hệ thống

Đây là nguồn nhầm lẫn lớn nhất khi đọc tài liệu trong repo này.

| | **SUT** – hệ thống *cần kiểm thử* | **Repo này** – nền tảng *chạy kiểm thử* |
| --- | --- | --- |
| Tên | OOP AutoGrader (chấm bài OOP cho sinh viên) | OOP AutoGrader: Automated Testing System |
| Ở đâu | `https://oop-autograder.vercel.app` · source: [Project-G5741/OOP-AutoGrader](https://github.com/Project-G5741/OOP-AutoGrader) – **không có code trong repo này** | Chính repo này: `automation/`, `backend/`, `frontend/`, `db/` |
| Công nghệ | Java / Spring Boot + React | Node.js + Playwright |
| Database | *Application DB* (của AutoGrader) | *Test Automation DB* (`db/schema/…`) |
| Yêu cầu chức năng | [`testing/fr-mapping.md`](./testing/fr-mapping.md), [`testing/test-plan.md`](./testing/test-plan.md) | [`architecture/SRS.md`](./architecture/SRS.md) |

Giải thích đầy đủ: [`database/phan-biet-cac-loai-database.md`](./database/phan-biet-cac-loai-database.md).

## Bản đồ tài liệu

| Thư mục / File | Nội dung | Đọc khi nào |
| --- | --- | --- |
| [`GIT_WORKFLOW.md`](./GIT_WORKFLOW.md) | Cấu trúc repo, chiến lược nhánh, quy ước commit, quy trình PR, CI, vòng đời dữ liệu test | **Đọc đầu tiên** khi mới vào nhóm |
| [`architecture/`](./architecture/) | SRS của nền tảng này + Context Diagram, Sequence Diagram, DFD Level 0 | Khi cần hiểu hệ thống gồm những khối gì, nói chuyện với nhau ra sao |
| [`testing/`](./testing/) | Test plan, ma trận `TC-01` → `TC-31`, ánh xạ FR ↔ TC, **tham chiếu SUT** (route, API, selector thật) | Khi viết spec Playwright hoặc kiểm tra độ phủ |
| [`database/`](./database/) | Phân biệt các loại DB + bảng phân công công việc DB & dữ liệu test (hướng b) | Khi làm migration, seed, fixture hoặc không rõ mình phụ trách việc nào |
| [`backend/`](./backend/) | Thiết kế backend dashboard + danh sách API endpoint | Khi code `backend/` hoặc gọi API từ `frontend/` |
| [`frontend/`](./frontend/) | Yêu cầu giao diện bản 1 → bản 3 (bản 3 được ưu tiên) + 11 ảnh thiết kế trong `design/` | Khi code `frontend/` |
| `parallel/` 🔒 | Brief cho hướng tiếp cận song song (AI agent) – dùng ở **repo khác** | Khi so sánh hai hướng làm đồ án |

🔒 = **không commit lên git** (`.gitignore`). Chỉ có trên máy từng người, hỏi trong nhóm nếu bạn chưa có.

## Trạng thái hiện tại (17/10/2026)

- **Bộ mã test case chuẩn: `TC-01` → `TC-31`** (31 test case). Mọi chỗ ghi "TC-01 → TC-44" đều là tài liệu cũ sai, đã sửa.
- **Chỉ có một spec:** `automation/tests/srs/plan.spec.js` – nó diễn giải `test_steps` / `test_data` lấy từ DB, không chứa kịch bản nào. Nên câu hỏi đúng là "TC này có steps trong DB chưa", không phải "đã viết spec chưa". Bảng trạng thái: [`testing/test-case-matrix.md`](./testing/test-case-matrix.md).
- Hướng đã chốt cho chạy test: **GitHub Actions** (`workflow_dispatch`), không chạy Playwright trên Vercel.
- 🛑 **Chặn:** `db/migrations/004` gán TC-23 → TC-27 cho kịch bản *sinh viên*, lệch với ma trận (*giảng viên*) – phải chốt trước khi viết spec.
- 🛑 **Chặn:** SUT không có `data-testid` nào, và runner cũng không có tiền tố `testid=` (chỉ `placeholder` / `text` / `role` / `css`) → thực tế chỉ dùng được `text=` và `placeholder=`. Xem [`../db/README.md`](../db/README.md) mục 3.
- Đã chốt (**đảo lại bản trước**): dùng **Template** làm thứ người dùng chọn để chạy, bảng `test_templates` với `target_json` trỏ `{ suiteId }` hoặc `{ testIds }`. Suite → spec → case vẫn là nơi *khai báo* test. Xem [`backend/Explain.md`](./backend/Explain.md).
- ✅ **Đã xong:** chuyển sang PostgreSQL/Supabase. `db/schema/` là Postgres, `backend/` dùng driver `pg`, không còn `mysql2`.
- ✅ **Đã xong (issue #97):** quyền vai trò `dev` – Dev **không** chạy test, kể cả chạy lại; Dev gửi yêu cầu, Admin/Tester duyệt.

## Nguồn chuẩn khi tài liệu mâu thuẫn nhau

Nhóm chốt (17/10/2026):

| Chủ đề | Nguồn chuẩn |
| --- | --- |
| Kiến trúc, yêu cầu chức năng, công nghệ, vai trò người dùng | [`architecture/SRS.md`](./architecture/SRS.md) |
| Cấu trúc bảng, tên bảng, tên cột, kiểu dữ liệu, ENUM | `db/schema/test_automation_db_schema.sql` |

Tài liệu khác và code hiện tại **phải theo hai nguồn trên**. Chỗ nào lệch là **việc còn phải làm**, không phải lý do sửa SRS hay schema.

⚠️ **Hai nguồn này vẫn sẽ được sửa về sau.** Khi nhóm chốt lại một quyết định thì **quyết định mới của nhóm được ưu tiên**:
sửa file nguồn chuẩn **trước**, rồi mới cập nhật tài liệu phụ thuộc.

### Việc còn phải làm để code khớp nguồn chuẩn

| Khoảng cách | Theo nguồn chuẩn | Chi tiết ở |
| --- | --- | --- |
| ~~Code là MySQL~~ | ✅ **Đã đóng.** `db/schema/` là PostgreSQL, `backend/` dùng `pg` | [`database/Explain.md`](./database/Explain.md) |
| ~~`permissions.js` xếp `Dev` ngang `Tester`~~ | ✅ **Đã đóng** (issue #97). `WRITE_ROLES = ['Admin','Tester']`, Dev chỉ gửi yêu cầu chạy lại | [`backend/api-endpoints.md`](./backend/api-endpoints.md) mục 6 |
| `db/seed/seed.sql` và `db/verify.sql` là **bản MySQL chết** (`ALTER TABLE … AUTO_INCREMENT` không có trên Postgres, tên bảng chữ hoa, cột `description`) | Không nằm trong `migrate.js` nên không ai chạy. Hoặc viết lại theo schema, hoặc xoá | [`database/Explain.md`](./database/Explain.md) |
| Thiếu `db/migrations/003_submission_steps_data.sql` → TC-13–22 không có steps, chưa chạy được | — | [`database/phan-cong-db-va-du-lieu.md`](./database/phan-cong-db-va-du-lieu.md) mục D6 |
| `/stats` và `/reports` chưa có dòng code nào | Dashboard tự tính từ `GET /runs`, Export làm ở client | [`backend/api-endpoints.md`](./backend/api-endpoints.md) mục 3 và 7 |

### Vẫn chờ nhóm quyết

- **Bộ mã test case:** `TC-AUTH-xxx` (seed) vs `TC-01` → `TC-31` (spec và `docs/testing/`). Schema không ràng buộc bộ mã nào.
- **DB cloud:** nhà cung cấp, SSL, user riêng. *(Hướng đã rõ: Supabase/PostgreSQL; `migrate.js` tự bật SSL khi connection string không trỏ localhost.)*

## Quy ước viết tài liệu

- Tiếng Việt có dấu đầy đủ; thuật ngữ kỹ thuật và tên định danh giữ nguyên tiếng Anh.
- Tên file: chữ thường, nối bằng `-`, không dấu (`phan-cong-db-va-du-lieu.md`). Ngoại lệ: `GIT_WORKFLOW.md`, `Explain.md`, `SRS.md`.
- File nguồn gốc (`.docx`, `.pdf`, `.drawio`, `.html`) **được giữ lại** cạnh bản Markdown tương ứng. Khi sửa, sửa **cả hai** hoặc ghi rõ bản nào là bản chuẩn.
- Mỗi tài liệu chuyển thể từ file nguồn phải có dòng `> **Nguồn:** …` ở đầu.
- Thêm thư mục mới trong `docs/` → thêm `Explain.md` cho thư mục đó và một dòng trong bảng "Bản đồ tài liệu" ở trên.
- Khi hai tài liệu nói khác nhau, **không sửa cả hai cho hòa**: xác định nguồn chuẩn ở bảng trên, sửa tài liệu phụ theo nó.
