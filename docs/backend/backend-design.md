# Thiết kế Backend (bản tóm tắt)

> Đi kèm [`api-endpoints.md`](./api-endpoints.md). Hướng đã chốt: **chạy test bằng GitHub Actions**.
> Phần **Template** chưa chốt – xem mục 7.
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
     │  POST /runs               │                                    │
     │──────────────────────────>│ 1. Tạo test_runs                   │
     │  202 { runId }            │ 2. Gọi workflow_dispatch(runId) ──>│
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

```sql
ALTER TABLE test_runs
  ADD run_name    VARCHAR(255) NULL,
  ADD config_json JSON NULL;          -- scope, env, timeout, bộ chọn test (để "Chạy lại")

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
Theo SRS, `Dev` được xem kết quả, log, chuỗi bước, bằng chứng và **request chạy lại**; không được tạo/sửa/xóa Template hay tự chạy test.

Khác:
- Thêm `html` vào `reports.report_type` (nếu làm Export HTML); `GITHUB` vào `users.auth_provider` (nếu làm GitHub login).
- ⚠️ `db/seed/seed.sql` và `db/migrations/001_srs_test_cases.sql` đang dùng `Test_Suites (suite_name, description)`, trong khi schema là `test_suites (…, suite_description)` → cần sửa cho khớp.

---

## 7. Template – CHƯA CHỐT

**Hiện trạng:** chỉ có ở Frontend – 3 mẫu viết cứng trong `frontend/src/models/mockData.js` (`SEED_TEMPLATES`), lưu ở **localStorage** qua `frontend/src/services/templateService.js`. Template chỉ là chữ mô tả (`name, requirements, scope, expectedOutput`), **không trỏ tới test có thật**.

**Câu hỏi cần nhóm trả lời:** khi bấm Run từ một template, GitHub Actions sẽ chạy **những test nào**?

| Phương án | Template lưu | Actions chạy | Ưu / nhược |
| --- | --- | --- | --- |
| A. Theo suite | `suite_id` | Toàn bộ test case của suite đó | Đơn giản nhất, DB đã có suite; kém linh hoạt |
| B. Theo tag | chuỗi tag, vd `@login` | `playwright test --grep @login` | Linh hoạt; phải gắn tag vào code test |
| C. Theo danh sách test case | bảng nối `template_cases` | Danh sách `automation_ref` | Chính xác nhất; tốn công nhất |

Trong lúc chưa chốt: Backend vẫn làm CRUD `/templates` với các trường hiện có, và **chừa sẵn** một trường "bộ chọn test" (`test_selector`) trong `templates` và `test_runs.config_json` để gắn phương án nào cũng được.

---

## 8. Thứ tự làm

1. **Khung:** `app.js`, `db.js`, `errorHandler`, `GET /health` → deploy thử Vercel.
2. **Auth + RBAC:** register / login / me, `requireAuth`, `requireRole` → FE bỏ mock đăng nhập.
3. **Luồng chạy test qua GitHub Actions:** `POST /runs` → workflow → `/ingest/*` → `GET /runs/:id`, `/logs?after=`. *(Rủi ro nhất – làm sớm.)*
4. **Lịch sử + báo cáo:** `GET /runs` có bộ lọc, export PDF.
5. **Thống kê, quản lý thành viên.**
6. **Template** (sau khi chốt mục 7) và các endpoint 🟡 còn lại.
