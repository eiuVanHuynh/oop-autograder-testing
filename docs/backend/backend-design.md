# Thiết kế Backend (bản tóm tắt)

> Đi kèm [`api-endpoints.md`](./api-endpoints.md). Hướng đã chốt: **chạy test bằng GitHub Actions**.
> Khái niệm **Template** đã bị bỏ, thay bằng **Suite** – xem mục 7.
>
> 📌 **Nguồn chuẩn** là [`../architecture/SRS.md`](../architecture/SRS.md) (kiến trúc, công nghệ, vai trò) và
> `db/schema/test_automation_db_schema.sql` (cấu trúc DB). Hai chỗ trong file này đã bị nguồn chuẩn phủ quyết:
> **mục 1 – MySQL** (SRS ghi Supabase/PostgreSQL) và **mục 6 – bỏ role `dev`** (SRS mục 4 và schema đều giữ 4 vai trò).
> Chi tiết ở [`../GIT_WORKFLOW.md`](../GIT_WORKFLOW.md) mục 9.

---

## 1. Công nghệ

| Phần | Chọn | Ghi chú |
| --- | --- | --- |
| Ngôn ngữ / framework | Node.js (CommonJS) + Express | Đồng bộ với `automation/` |
| Database | MySQL qua `mysql2` | Dùng chung cấu hình với `automation/tests/utils/db-client.js` |
| Deploy API | Vercel (`backend/api/index.js`) | Serverless – **không chạy được Playwright** |
| Chạy test | **GitHub Actions** (`workflow_dispatch`) | Repo public → miễn phí, không giới hạn phút |
| Đăng nhập | JWT + `bcrypt`; Google qua `google-auth-library` | FE đã gửi `Authorization: Bearer` |
| Validate | `zod` | |
| PDF | Tách logic từ `automation/scripts/export-report.js` thành module dùng chung | Stream thẳng về client (Vercel chỉ ghi được `/tmp`) |

---

## 2. Luồng chạy test

```
 [Frontend]                [Backend API – Vercel]              [GitHub Actions]
     │  POST /runs { suiteId }   │                                    │
     │──────────────────────────>│ 1. Suite → danh sách tc_code →     │
     │                           │    biểu thức grep (mục 7)          │
     │  202 { runId }            │ 2. Tạo test_runs, rồi gọi          │
     │                           │    workflow_dispatch(runId, grep) ─>│
     │<──────────────────────────│                                    │ 3. Cài deps, chạy Playwright
     │                           │<── POST /ingest/runs/:id/logs ─────│ 4. Reporter đẩy log
     │  GET /runs/:id/logs?after │<── POST /ingest/runs/:id/results ──│ 5. Đẩy kết quả từng test
     │  (hỏi lại mỗi 1–2 giây)   │<── PATCH /ingest/runs/:id/finish ──│ 6. Báo xong
     │──────────────────────────>│                                    │
     │  GET /runs/:id (báo cáo)  │                                    │
```

**Trạng thái một lần chạy:** `running` → `passed` / `failed` / `cancelled` – **tính ra từ dữ liệu có sẵn**, không lưu cột riêng (xem mục 6).

**Hủy test:** `POST /runs/:id/cancel` → Backend gọi GitHub API hủy workflow run (dùng `test_runs.ci_run_id`).

**Log real-time:** dùng **polling** `GET /runs/:id/logs?after=<seq>` là chính, vì Vercel cắt kết nối mở lâu. SSE chỉ là tùy chọn khi chạy local.

---

## 3. Cấu trúc thư mục

```
backend/
├── api/index.js            # Entry cho Vercel: module.exports = require('../src/app')
├── src/
│   ├── server.js           # Chạy local: app.listen(5000)
│   ├── app.js              # Express: cors, json, mount /api, errorHandler
│   ├── config/  env.js  db.js
│   ├── routes/             # Khai báo URL → middleware → controller
│   ├── middlewares/
│   │   ├── requireAuth.js     # Kiểm tra JWT → req.user (401 / 423)
│   │   ├── requireRole.js     # requireRole('admin','tester') → 403
│   │   ├── requireApiKey.js   # Cho /ingest/* (GitHub Actions gọi)
│   │   ├── validate.js        # zod → 400
│   │   └── errorHandler.js    # AppError → status code + JSON lỗi
│   ├── controllers/        # Mỏng: đọc req → gọi service → trả res
│   ├── services/           # Quy tắc nghiệp vụ (+ github.service.js gọi Actions)
│   ├── models/             # Chỉ chứa câu SQL
│   └── utils/  AppError.js  asyncHandler.js  mappers.js
└── tests/                  # supertest
```

Đường đi một request: `route → requireAuth → requireRole → validate → controller → service → model → DB`.
Service/model viết dạng **class** (phù hợp môn OOP, dễ mock khi test).

---

## 4. Quy ước chung

- **Response thành công:** `{ data, meta? }` – `meta` = `{ page, pageSize, total }`.
- **Response lỗi:** `{ error: { code: 'EMAIL_TAKEN', message, details? } }`.
- **Phân trang:** `?page=1&pageSize=20` (tối đa 100).
- **Đặt tên:** DB `snake_case`/enum chữ thường ↔ FE `camelCase`/chữ hoa. Chuyển đổi **chỉ ở** `utils/mappers.js`. Không bao giờ trả `password_hash`.
- **Thời gian:** ISO 8601, timezone `+07:00` (giống `db-client.js`).
- **Phân quyền:** chặn ở **cả FE (ẩn nút) lẫn BE (trả 403)**.

---

## 5. GitHub Actions – cấu hình & lưu ý

**Workflow** `.github/workflows/run-tests.yml`, kích hoạt bằng `workflow_dispatch` với input `run_id` (+ bộ chọn test – xem mục 7). Các bước: checkout → `npm ci` → cache & cài Chromium → `playwright test` → reporter đẩy kết quả về `/ingest/*`.

**Biến môi trường / secret:**

| Ở đâu | Biến | Dùng để |
| --- | --- | --- |
| Vercel | `JWT_SECRET`, `DB_*`, `GOOGLE_CLIENT_ID` | API chạy |
| Vercel | `GITHUB_TOKEN` (fine-grained, chỉ repo này, quyền `actions:write`) | Gọi `workflow_dispatch` / hủy run |
| Vercel + GitHub Secrets | `INGEST_API_KEY` | Actions xác thực khi gọi `/ingest/*` |
| GitHub Secrets | `API_BASE_URL`, tài khoản test (`TEST_*`) | Playwright chạy |

**Lưu ý:**

1. **Chi phí:** repo public → 0đ. Nếu chuyển private: 2.000 phút/tháng miễn phí (~700–1.000 lần chạy), vượt ~$0,006/phút.
2. **Log Actions trên repo public ai cũng xem được** → không in mật khẩu, chuỗi kết nối DB, token. Mọi bí mật để trong GitHub Secrets.
3. **Độ trễ khởi động 20–60 giây** → FE hiển thị "Đang chuẩn bị máy chạy…" khi chưa có log nào. Cache Chromium để giảm ~1 phút.
4. **Run bị kẹt** (Actions lỗi, không gọi `finish`): có cơ chế đánh dấu `failed` nếu quá `timeout` cấu hình.

---

## 6. Thay đổi Database cần có

> Nguyên tắc: **dữ liệu tạm không lưu lâu dài**. Lưu ý: Vercel là serverless – **không giữ được dữ liệu trong RAM** giữa các request (mỗi request có thể rơi vào máy khác, máy có thể bị tắt bất cứ lúc nào), nên "tạm" vẫn phải nằm ở nơi dùng chung (DB hoặc Redis).

| Nhu cầu | Cách làm | Thay đổi DB |
| --- | --- | --- |
| **Trạng thái run** | **Tính ra**, không lưu: `finished_at IS NULL` → đang chạy; có `test_results` `failed`/`timedOut` → failed; còn lại → passed. Khi hủy: ghi các kết quả dở thành `interrupted` (enum có sẵn) → cancelled. | Không |
| **Log real-time** | Bảng tạm `run_logs`, **xóa log khi run xong** (hoặc sau ~1 ngày). Phương án thay thế: Redis miễn phí (vd Upstash) có TTL tự hết hạn. | Bảng tạm (hoặc không, nếu dùng Redis) |
| **Reset mật khẩu** | **Token JWT không lưu trữ**: chứa `userId`, hạn 15 phút, ký bằng `JWT_SECRET` + một phần `password_hash` hiện tại → đổi mật khẩu xong token cũ tự vô hiệu (dùng 1 lần). | Không |
| **Tên run, cấu hình để Chạy lại** | Dữ liệu lâu dài (Lịch sử cần hiển thị) → thêm cột. | 2 cột |
| **Chọn test để chạy** | Dùng `test_suites` → `test_specs` → `test_cases` đã có sẵn, sinh biểu thức `--grep` từ `tc_code` (mục 7). | **Không** – bỏ hẳn bảng `templates` và bảng nháp cấu hình |

```sql
ALTER TABLE test_runs
  ADD run_name    VARCHAR(255) NULL,
  ADD config_json JSON NULL;          -- { suiteId | testIds, grep, env, timeout } – đủ để "Chạy lại"

-- Bảng tạm: log bị xóa sau khi run kết thúc
CREATE TABLE run_logs (
  log_id     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  run_id     INT UNSIGNED NOT NULL,
  seq        INT UNSIGNED NOT NULL,   -- phục vụ ?after=seq
  level      ENUM('info','warn','error') NOT NULL DEFAULT 'info',
  message    TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_run_seq (run_id, seq),
  FOREIGN KEY (run_id) REFERENCES test_runs(run_id) ON DELETE CASCADE
);
```

Nếu sau này truy vấn Lịch sử / Dashboard chậm do phải tính trạng thái, mới cân nhắc thêm cột `run_status`.

**Role `dev`:** ~~gộp vào Viewer~~ – ❌ **đề xuất này đã bị bỏ.**

Nguồn chuẩn giữ đủ **4 vai trò**: [`../architecture/SRS.md`](../architecture/SRS.md) mục 4 có *Developer*, và
`db/schema/` có `ENUM('admin','tester','dev','viewer')`. Không chạy `UPDATE`/bỏ ENUM nữa.

⚠️ Vẫn cần sửa `frontend/src/models/permissions.js`: chỗ này đang coi `Dev` như **Tester** (`WRITE_ROLES`), rộng hơn SRS.
Theo SRS, `Dev` được xem kết quả, log, chuỗi bước, bằng chứng và **request chạy lại**; không được tạo/sửa/xóa Suite hay tự chạy test.

Khác:
- Thêm `html` vào `reports.report_type` (nếu làm Export HTML); `GITHUB` vào `users.auth_provider` (nếu làm GitHub login).
- ⚠️ `db/seed/seed.sql` và `db/migrations/001_srs_test_cases.sql` đang dùng `Test_Suites (suite_name, description)`, trong khi schema là `test_suites (…, suite_description)` → cần sửa cho khớp.

---

## 7. Suite – ĐÃ CHỐT (thay cho Template)

**Quyết định:** bỏ khái niệm *Template*. Thứ người dùng chọn để chạy là **Test Suite** – bảng `test_suites` đã có sẵn trong schema.

### 7.1 Vì sao bỏ Template

| Vấn đề của Template | |
| --- | --- |
| Không trỏ tới thứ gì chạy được | 3 mẫu viết cứng trong `frontend/src/models/mockData.js` (`SEED_TEMPLATES`), lưu ở **localStorage** qua `templateService.js`. Chỉ là chữ mô tả (`name, requirements, scope, expectedOutput`). |
| Trùng vai trò với Suite | `test_suites` vốn đã là "một nhóm test chạy cùng nhau", lại nằm sẵn trong DB và đã có dữ liệu. Thêm `templates` là tạo hai khái niệm làm một việc. |
| Phải tự bịa cơ chế ánh xạ | Template → test nào là câu hỏi không có đáp án tự nhiên. Suite → spec → test case là quan hệ **đã có khóa ngoại** trong schema. |

Đây cũng là vấn đề số 2 trong danh sách nợ kỹ thuật ở `docs/parallel/AGENT_BRIEF.md` mục 3 – *"Template không trỏ tới thứ gì chạy được"*.

### 7.2 Mô hình

```
test_suites ──1:n──> test_specs ──1:n──> test_cases
 suite_name            spec_code            tc_code  (TC-01, TC-02, …)
                                            automation_ref  (tùy chọn)
```

Cả 3 bảng đã có trong `db/schema/test_automation_db_schema.sql`. **Không cần bảng mới.**

### 7.3 Chạy một suite

Spec Playwright đặt tiêu đề test theo dạng `` `${testId} - ${title}` `` (xem `automation/tests/auth/auth.spec.js`),
nên `tc_code` **đã nằm trong tiêu đề test** – chọn test bằng `--grep` mà không phải gắn tag thủ công.

1. `POST /runs` nhận `{ suiteId, env?, timeout? }`.
2. Backend đọc danh sách `tc_code` của suite đó:

```sql
SELECT c.tc_code
FROM test_cases c
JOIN test_specs s ON s.spec_id = c.spec_id
WHERE s.suite_id = ? AND c.test_status = 'ready'
ORDER BY c.tc_code;
```

3. Ghép thành biểu thức grep: `(TC-01|TC-02|TC-31) - `
   *(giữ cả ` - ` ở cuối để `TC-01` không khớp nhầm `TC-010` về sau).*
4. Lưu vào `test_runs.config_json` rồi truyền sang `workflow_dispatch` làm input `grep`.
5. Workflow chạy `npx playwright test --grep "<biểu thức>"`.

**"Chạy lại"** = đọc `config_json` của lần chạy cũ và gửi lại y nguyên. Không cần lưu thêm gì.

### 7.4 Quy tắc

- **Lọc `test_status = 'ready'`.** Test case `draft` hoặc `deprecated` không đưa vào grep.
- **Suite rỗng → `409`**, không gọi workflow. Tránh một lần chạy không có test nào rồi báo `passed`.
- **`automation_ref` là lối thoát.** Cột này đã có và `UNIQUE`, hiện chưa dùng. Khi một test case không đặt tiêu đề theo
  `tc_code`, điền đường dẫn/biểu thức thật vào đây; backend ưu tiên `automation_ref` nếu có, không thì dùng `tc_code`.
- **Chạy một test lẻ** vẫn hỗ trợ: `POST /runs` với `{ testIds: ['TC-05'] }` thay cho `suiteId`. Cùng một đường đi, chỉ khác nguồn danh sách.

### 7.5 Ảnh hưởng tới các phần khác

| Chỗ | Thay đổi |
| --- | --- |
| `api-endpoints.md` mục 4 (`/templates`) | ❌ Bỏ. Thay bằng `/suites` ở mục 9, nâng từ 🟡 lên 🔴 |
| `api-endpoints.md` mục 5 (bản nháp cấu hình) | ❌ Bỏ – không còn form nhập chữ tự do để lưu nháp |
| `api-endpoints.md` Phụ lục B ý 1, 2 (bảng `templates`, bảng nháp) | ❌ Bỏ – không cần bảng mới |
| Frontend: màn hình *Template Management* | → đổi thành **Suite Management** (CRUD `test_suites`, `test_specs`, `test_cases`) |
| Frontend: form *Tạo Test* với "Yêu cầu test" nhập chữ tự do | → đổi thành **chọn suite** (hoặc chọn các test case) rồi bấm Run |
| `frontend/src/services/templateService.js`, `SEED_TEMPLATES` | ❌ Xóa – localStorage không còn vai trò |

> ⚠️ Việc này sửa đứt một phần yêu cầu giao diện ở `docs/frontend/02-yeu-cau-giao-dien-v2.md` mục 3 và 5.
> Cần cập nhật tài liệu giao diện cho khớp trước khi code frontend tiếp.

## 8. Thứ tự làm

1. **Khung:** `app.js`, `db.js`, `errorHandler`, `GET /health` → deploy thử Vercel.
2. **Auth + RBAC:** register / login / me, `requireAuth`, `requireRole` → FE bỏ mock đăng nhập.
3. **Luồng chạy test qua GitHub Actions:** `POST /runs` → workflow → `/ingest/*` → `GET /runs/:id`, `/logs?after=`. *(Rủi ro nhất – làm sớm.)*
4. **Lịch sử + báo cáo:** `GET /runs` có bộ lọc, export PDF.
5. **Thống kê, quản lý thành viên.**
6. **Suite Management:** CRUD `/suites`, `/specs`, `/cases` (mục 7) và các endpoint 🟡 còn lại.

> Bước 3 chỉ cần `POST /runs { testIds: [...] }` là chạy được luồng xương sống – **không phải chờ** Suite Management ở bước 6.
> Làm xương sống trước, màn hình quản lý sau.
