# OOP AutoGrader — Test Automation Repo: Cấu trúc & Quy trình làm việc nhóm

## 1. Cấu trúc thư mục repo

Repo này **tách biệt hoàn toàn** với source code sản phẩm OOP AutoGrader. Repo gồm 3 phần chính:

- `automation/`: kiểm thử tự động bằng Node.js + Playwright. **Không nối DB**: nó lấy kế hoạch chạy từ backend và đẩy log/kết quả về `POST /api/ingest/*` (reporter `automation/reporters/push-to-backend.js`).
- `backend/` + `frontend/`: dashboard quản lý test case, lần chạy, kết quả, bug (mô hình MVC, deploy lên Vercel).
- `db/`: schema, migration, dữ liệu mẫu của `test_automation_db`.

```
oop-autograder-testing/
├── .github/
│   └── workflows/                      # CI: playwright-ci.yml (sẽ bổ sung)
│
├── automation/                         # Kiểm thử tự động (Node.js + Playwright)
│   ├── tests/                          # Spec, chia theo phân hệ
│   │   ├── auth/                       # auth.spec.js, auth-db.spec.js
│   │   ├── submission/                 # submission.spec.js
│   │   ├── student/                    # (sẽ bổ sung)
│   │   ├── lecturer/                   # (sẽ bổ sung: TC-23 → TC-30)
│   │   ├── db/                         # db-connection.spec.js
│   │   ├── fixtures/                   # auth.fixture.js: login helper dùng chung (CODE)
│   │   ├── models/                     # *.model.js: class mô tả dữ liệu test
│   │   └── utils/                      # fixture-builder.js (không có client DB nào)
│   ├── reporters/
│   │   ├── test-result-logger.js       # Ghi kết quả vào test_runs / test_results
│   │   └── push-to-backend.js          # (sẽ bổ sung) gửi kết quả qua API backend
│   ├── scripts/
│   │   └── export-report.js            # Xuất báo cáo PDF từ DB
│   ├── fixtures/                       # DỮ LIỆU test: CSV, bài mẫu .java / .mmd
│   ├── api/  data/  performance/       # (sẽ bổ sung: test API, dữ liệu, hiệu năng)
│   ├── playwright.config.js
│   └── package.json
│
├── backend/                            # API quản lý test (Node.js + Express, MVC)
│   ├── api/index.js                    # Entry cho Vercel
│   ├── src/
│   │   ├── app.js
│   │   ├── config/                     # db.js
│   │   ├── models/                     # TestSuite, TestCase, TestRun, TestResult, Bug
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── services/
│   │   └── middlewares/
│   ├── tests/
│   └── vercel.json
│
├── frontend/                           # Dashboard (React), deploy Vercel
│   └── src/
│       ├── views/                      # Dashboard, TestCaseList, TestRun, BugList, Report
│       ├── components/
│       ├── controllers/
│       ├── models/
│       ├── services/                   # Gọi API backend
│       └── routes/
│
├── db/
│   ├── schema/
│   │   └── test_automation_db_schema.sql   # test_suites, test_cases, test_specs, test_steps,
│   │                                        # test_data, test_runs, test_results, bug_feedbacks
│   ├── migrations/                     # Mỗi thay đổi schema = 1 file, đánh số tăng dần
│   └── seed/
│       └── seed.sql                    # Dữ liệu mẫu (suite, test case, spec, step, data)
│
├── docs/                               # Xem docs/Explain.md để biết thư mục nào chứa gì
│   ├── Explain.md                      # Mục lục toàn bộ tài liệu
│   ├── GIT_WORKFLOW.md                 # File này
│   ├── architecture/                   # SRS + sơ đồ kiến trúc, DFD, sequence
│   ├── backend/                        # Thiết kế backend + danh sách API endpoint
│   ├── frontend/                       # Yêu cầu giao diện (v1, v2)
│   ├── database/                       # Phân biệt các loại DB + phân công DB/dữ liệu test
│   ├── testing/                        # test-plan, test-case-matrix (TC-01 → TC-31), fr-mapping
│   └── parallel/                       # Brief cho hướng tiếp cận song song (repo khác)
│
├── .env                                # Cấu hình local, KHÔNG commit
├── .env.example                        # Mẫu biến môi trường (giá trị giả)
├── .gitignore
├── .gitattributes
└── README.md                           # (sẽ bổ sung) hướng dẫn cài đặt & chạy test
```

**Hai thư mục `fixtures` khác nhau:**

- `automation/tests/fixtures/` chứa **code** fixture của Playwright (login helper).
- `automation/fixtures/` chứa **file dữ liệu** dùng để upload khi test (CSV, bài `.java`, `.mmd`).

**Vì sao chia `tests/` theo 3 phân hệ (auth / student / lecturer)?** Mỗi thư mục ánh xạ 1-1 với một `module_group` trong bảng `test_suites`, giúp map trực tiếp: `suite_name` → tên thư mục → tên file `.spec.js`.

---

## 2. Chiến lược nhánh (Branching)

```
main            ← luôn chạy được, được bảo vệ, chỉ merge qua Pull Request
└─ dev         ← nhánh tích hợp, các nhánh tính năng merge vào đây trước khi lên main
    ├─ test/auth-login-irn
    ├─ test/student-upload
    ├─ db/cloud-ready
    └─ fix/db-table-name-case
```

- **`main`**: bảo vệ bằng branch protection: bắt buộc PR + tối thiểu 1 review (+ CI pass khi đã có workflow).
- **`dev`**: nhánh tích hợp hằng ngày. **Không commit thẳng**, chỉ merge qua PR.
- **Nhánh tính năng** đặt tên `<loại>/<mô-tả-ngắn>`:

 - `test/...`: thêm / sửa test case, spec

 - `db/...`: thay đổi schema, migration, seed

 - `fix/...`: sửa lỗi

 - `docs/...`: cập nhật tài liệu

 - `refactor/...`: tổ chức lại cấu trúc, không đổi hành vi

 - `feat/...`: tính năng mới của dashboard (backend / frontend)

 - `chore/...`: việc vặt (cấu hình, dependencies)

## 3. Quy ước Commit

Dùng **Conventional Commits**, gắn mã Test ID khi liên quan đến test case để dễ truy vết:

```
test(auth): add TC-05 wrong password case
db(schema): use lowercase table names
fix(student): correct selector for dropzone upload TC-16
docs(git-workflow): update repo structure
refactor: reorganize repo into automation, backend, frontend
feat(backend): add test run controller
chore: update .gitignore
```

## 4. Phân công theo module

| Phân hệ | Thư mục phụ trách | Số TC | Gợi ý phân công |
|---|---|---|---|
| Xác thực & Quản lý người dùng | `automation/tests/auth/` | TC-01 → 12, TC-31 | 1 thành viên chuyên Auth |
| Nộp bài & Chấm điểm (Sinh viên) | `automation/tests/student/`, `submission/` | TC-13 → 22 | 1-2 thành viên |
| Quản lý của Giảng viên | `automation/tests/lecturer/` | TC-23 → 30 | 1-2 thành viên |
| Dashboard (backend + frontend) | `backend/`, `frontend/` | — | 1-2 thành viên |
| DB schema & CI | `db/`, `.github/` | — | 1 thành viên phụ trách hạ tầng chung |

Mỗi người **chỉ merge vào `dev` qua PR**, không push thẳng để tránh đè code nhau (đặc biệt là file seed).

## 5. Quy trình Pull Request

1. Tạo issue trên GitHub (hoặc Project board) cho từng nhóm TC, gắn nhãn `auth` / `student` / `lecturer` / `db` / `dashboard`.
2. Cập nhật `dev` (Fetch / Pull), tạo nhánh từ `dev`, code + viết spec Playwright tương ứng.
3. Chạy local trước khi push:

  ```bash
  cd automation
  npx playwright test tests/auth/
  ```

4. Mở PR vào `dev`, mô tả liệt kê rõ **Test ID** được cover (vd "Covers TC-04, TC-05, TC-06").
5. CI tự động chạy suite liên quan (khi đã có workflow).
6. Ít nhất 1 người review, ưu tiên người phụ trách phân hệ khác review chéo để phát hiện selector / spec sai.
7. Merge bằng **Squash and merge** để lịch sử `dev` gọn.
8. Sau khi merge: xóa nhánh cũ, các nhánh khác đang làm dở **Branch → Update from dev**.
9. Định kỳ (cuối mỗi sprint hoặc khi cần nộp) mở PR `dev` → `main` khi toàn bộ suite pass.

## 6. CI/CD (GitHub Actions)

✅ **Đã có: [`.github/workflows/run-tests.yml`]** (không phải `playwright-ci.yml` như bản kế hoạch này ghi).
Nó **không chạy khi push/PR** mà chạy khi backend gọi `workflow_dispatch` với `run_id`:

1. Backend (Vercel) tạo dòng `test_runs` trước, rồi kích hoạt workflow kèm `run_id`, `env`, `timeout`.
2. CI checkout, `npm ci` trong `automation/`, `npx playwright install --with-deps chromium`.
3. **Không khởi tạo DB.** CI không có chuỗi kết nối DB – nó gọi backend lấy kế hoạch chạy
   (`npm run plan` → `scripts/fetch-plan.js`), vì backend là nơi duy nhất viết SQL (`backend-design.md` mục 5).
4. Chạy `npx playwright test`. `CI=true` tự bật headless.
5. Reporter `automation/reporters/push-to-backend.js` (thay cho `test-result-logger.js` cũ ghi thẳng MySQL)
   đẩy log + kết quả về `POST /api/ingest/*`, xác thực bằng `INGEST_API_KEY`.
6. `concurrency`: một `run_id` chỉ một job – trùng thì hủy lần cũ, vì `PATCH /finish` gọi lần hai trả `409`.

> Vì chạy bằng `workflow_dispatch`, test **không** chặn merge PR. Muốn chặn thì phải thêm một workflow
> `on: [pull_request]` riêng.

Thông tin nhạy cảm (mật khẩu DB, tài khoản test) lưu trong **GitHub Secrets**, không ghi vào workflow hay code.

## 7. File cấu hình quan trọng

**`.env`** đặt ở **thư mục gốc** (`playwright.config.js` đọc `../.env`), không commit. Mẫu trong `.env.example`:

```
BASE_URL=https://oop-autograder.vercel.app
PW_BROWSER=chromium
TEST_STUDENT_IRN=20210000
TEST_STUDENT_PASSWORD=your_student_password
TEST_LECTURER_IRN=lecturer.example
TEST_LECTURER_PASSWORD=your_lecturer_password
TEST_RESET_TOKEN=
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=test_automation_db
DB_SSL=false
```

**`.gitignore`** (tối thiểu):

```
node_modules/
.env
test-results/
playwright-report/
*.log
```

**Deploy lên Vercel:** tạo **2 project** từ cùng repo, một project đặt *Root Directory* = `frontend`, một project đặt *Root Directory* = `backend`. Biến môi trường (DB, CORS...) cấu hình ở phần Environment Variables của từng project. Thư mục `automation/` **không** deploy lên Vercel (Playwright cần trình duyệt, chạy bằng GitHub Actions hoặc máy local).

## 8. Vòng đời dữ liệu test (đồng bộ code ↔ DB)

- `db/schema/` và `db/migrations/` luôn commit vào Git. **Không sửa DB thủ công** ngoài migration để cả nhóm có schema giống nhau.
- **Schema** tạo cấu trúc; **seed** nhập dữ liệu mẫu (suite, test case, spec, step, data); **migration** là thay đổi cấu trúc về sau. Thứ tự chạy: schema → seed.
- Với DB cloud: schema dùng `CREATE TABLE IF NOT EXISTS` (không `DROP TABLE`), không có `CREATE DATABASE` / `USE`; seed chỉ chạy một lần trên DB trống (không `DELETE` dữ liệu đang có).
- `test_runs` và `test_results` **không** nằm trong seed vì do Playwright tự ghi mỗi lần chạy.
- Seed nên tách theo suite (`seed_auth_suite.sql`, `seed_student_suite.sql`...) trùng với thư mục `tests/`, để mỗi người chỉ sửa đúng file của mình, tránh conflict.
- Chạy local nên trỏ vào một DB riêng (PostgreSQL trong Docker – xem `docker-compose.yml` và `db/SETUP-LOCAL.md`), không dùng chung DB cloud, tránh ghi đè `test_runs` của nhau.

## 9. Nguồn chuẩn khi tài liệu mâu thuẫn nhau

Nhóm chốt (17/10/2026) hai nguồn chuẩn:

| Chủ đề | Nguồn chuẩn |
| --- | --- |
| Kiến trúc, yêu cầu chức năng, công nghệ, vai trò người dùng | [`architecture/SRS.md`](./architecture/SRS.md) |
| Cấu trúc bảng, tên bảng, tên cột, kiểu dữ liệu, ENUM | `db/schema/test_automation_db_schema.sql` |

Mọi tài liệu khác (kể cả [`backend/backend-design.md`](./backend/backend-design.md)) và code hiện tại **phải theo hai nguồn trên**.

⚠️ **Hai nguồn này vẫn sẽ được sửa về sau.** Khi nhóm chốt lại một quyết định thì **quyết định mới của nhóm được ưu tiên** –
sửa file nguồn chuẩn **trước**, rồi mới cập nhật tài liệu phụ thuộc. Đừng sửa tài liệu phụ mà để nguồn chuẩn cũ.

### Việc còn phải làm để code khớp nguồn chuẩn

- ✅ **Lưu trữ – đã đóng.** `db/schema/` là PostgreSQL, `backend/` dùng driver `pg`, không còn `mysql2`.
  Một điểm lệch có chủ đích còn lại: **không dùng Supabase Storage** – ảnh bằng chứng là `bytea` trong
  `test_evidences.content`, phục vụ qua `GET /api/evidences/:token` (migration `015`). Sửa SRS mục D4 cho khớp.
- ✅ **Vai trò – đã đóng** (issue #97). `permissions.js` có `WRITE_ROLES = ['Admin','Tester']`; Dev **không** chạy
  test kể cả chạy lại, mà gửi yêu cầu `POST /runs/:id/rerun-requests` cho Admin/Tester duyệt, và **duyệt không tự
  chạy test**. Xem [`backend/api-endpoints.md`](./backend/api-endpoints.md) mục 6.
- **`db/seed/seed.sql` và `db/verify.sql` là bản MySQL chết.** Tên bảng chữ hoa, cột `description`,
  `DELETE FROM Test_Suites WHERE suite_id > 0`, `ALTER TABLE … AUTO_INCREMENT = 1` (cú pháp chỉ MySQL có).
  Chúng **không nằm trong `migrate.js`** nên không ai chạy và không ai thấy lỗi — bản đang dùng là
  `010_seed_auth_postgres.sql`. Việc phải làm: viết lại theo schema, hoặc xoá hẳn. Cùng nhóm: migration
  `001`, `002`, `004`, `005`, `006` (giữ lại làm bằng chứng truy nguyên cho báo cáo, **đừng chạy**).
- **Thiếu `db/migrations/003_submission_steps_data.sql`** (mục D6 trong [`database/phan-cong-db-va-du-lieu.md`](./database/phan-cong-db-va-du-lieu.md));
  hiện nhảy từ `002` sang `004`, nên **TC-13 → TC-22 không có steps trong DB và chưa chạy được**.
- **`/stats` và `/reports` chưa có dòng code nào.** Dashboard tự tính số liệu từ `GET /runs`, nút Export
  dựng HTML ở client (`frontend/src/models/reportHtml.js`).

### Vẫn còn chờ nhóm quyết

- **Bộ mã test case:** `db/seed/seed.sql` dùng `TC-AUTH-xxx` / `TC-UI-xxx`, còn spec và `docs/testing/` dùng `TC-01` → `TC-31`.
  Schema không ràng buộc bộ mã nào nên đây là quyết định thuần của nhóm. Hiện tài liệu đang dùng **`TC-01` → `TC-31` (31 test case)**;
  mọi chỗ ghi "TC-01 → TC-44" là tài liệu cũ sai.
- **DB cloud:** chọn nhà cung cấp, cấu hình SSL, tạo user riêng (không dùng `root`). *(`migrate.js` đã tự bật SSL khi connection string không trỏ localhost.)*

### Đã chốt gần đây

- **Bỏ khái niệm "Template", dùng Test Suite.** Thứ người dùng chọn để chạy là một bộ test (`test_suites` → `test_specs` →
  `test_cases`), backend sinh biểu thức `--grep` từ danh sách `tc_code`. Không cần bảng DB mới.
  Xem [`backend/backend-design.md`](./backend/backend-design.md) mục 7.
  ⚠️ Việc này làm lỗi thời một phần tài liệu yêu cầu giao diện (màn hình Template Management, form nhập "Yêu cầu test").
