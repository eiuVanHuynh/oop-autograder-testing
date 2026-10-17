# OOP AutoGrader — Test Automation Repo: Cấu trúc & Quy trình làm việc nhóm

## 1. Cấu trúc thư mục repo

Repo này **tách biệt hoàn toàn** với source code sản phẩm OOP AutoGrader. Repo gồm 3 phần chính:

- `automation/`: kiểm thử tự động bằng Node.js + Playwright, ghi kết quả vào MySQL.
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
│   │   └── utils/                      # db-client.js: kết nối MySQL
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

`.github/workflows/playwright-ci.yml` (sẽ bổ sung) nên:

1. Checkout code, `npm ci` trong thư mục `automation/` (dùng `working-directory: automation`).
2. Cài trình duyệt: `npx playwright install --with-deps chromium`.
3. Khởi tạo DB: dùng MySQL (service container hoặc DB cloud), chạy `db/schema/*.sql` rồi `db/seed/*.sql`.
4. Chạy `npx playwright test`. Biến `CI=true` sẽ tự bật chế độ headless (xem `playwright.config.js`).
5. `test-result-logger.js` ghi kết quả vào `test_runs` / `test_results`.
6. Upload `automation/test-results/` (và `playwright-report/` nếu bật HTML reporter) làm artifact để xem lại khi fail.
7. Nếu có test fail → PR check "fail", chặn merge.

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
- Chạy local nên trỏ vào một DB riêng (vd MySQL trong Docker), không dùng chung DB với CI hoặc DB cloud chung, tránh ghi đè `test_runs` của nhau.

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

- **Tên bảng và tên cột – theo schema (`snake_case` chữ thường).**
  `db/seed/seed.sql` và `db/migrations/001`, `002` đang dùng `Test_Suites`, `Test_Cases` (chữ hoa) và cột `description`,
  trong khi schema là `test_suites` và `suite_description`; `004` thì đã đúng chữ thường.
  MySQL trên Linux phân biệt hoa/thường tên bảng → **chạy sẽ lỗi**, cần sửa seed và hai migration đó.
- **Vai trò – theo SRS và schema: giữ đủ 4 vai trò** (Admin / Tester / Dev / Viewer).
  Điều này **đảo lại** đề xuất bỏ `dev` ở [`backend/backend-design.md`](./backend/backend-design.md) mục 6.
  Cần định nghĩa rõ quyền của `dev` (SRS mục 4: xem kết quả, log, bằng chứng, **được request chạy lại**; không tạo/sửa/xóa)
  rồi sửa `frontend/src/models/permissions.js` – chỗ này đang xếp `Dev` ngang `Tester`, rộng hơn SRS cho phép.
- **Lưu trữ – theo SRS: đích là Supabase (PostgreSQL) + Supabase Storage.**
  Code hiện tại là MySQL. Đây là khoảng cách cần thu hẹp, kéo theo `db/schema/`, toàn bộ migration và `mysql2` → client PostgreSQL.
  Nếu nhóm thấy không khả thi thì **sửa SRS trước** rồi mới chốt ở lại MySQL.
- **`db/seed/seed.sql` có `DELETE FROM Test_Suites WHERE suite_id > 0;` và `ALTER TABLE … AUTO_INCREMENT = 1`** –
  trái với quy tắc ở mục 8 ("seed chỉ chạy một lần trên DB trống, không `DELETE` dữ liệu đang có"). Chốt lại một trong hai.
- **Thiếu `db/migrations/003_submission_steps_data.sql`** (mục D6 trong [`database/phan-cong-db-va-du-lieu.md`](./database/phan-cong-db-va-du-lieu.md));
  hiện nhảy từ `002` sang `004`.

### Vẫn còn chờ nhóm quyết

- **Bộ mã test case:** `db/seed/seed.sql` dùng `TC-AUTH-xxx` / `TC-UI-xxx`, còn spec và `docs/testing/` dùng `TC-01` → `TC-31`.
  Schema không ràng buộc bộ mã nào nên đây là quyết định thuần của nhóm. Hiện tài liệu đang dùng **`TC-01` → `TC-31` (31 test case)**;
  mọi chỗ ghi "TC-01 → TC-44" là tài liệu cũ sai.
- **DB cloud:** chọn nhà cung cấp, cấu hình SSL, tạo user riêng (không dùng `root`). Gắn với quyết định MySQL ↔ Supabase ở trên.

### Đã chốt gần đây

- **Bỏ khái niệm "Template", dùng Test Suite.** Thứ người dùng chọn để chạy là một bộ test (`test_suites` → `test_specs` →
  `test_cases`), backend sinh biểu thức `--grep` từ danh sách `tc_code`. Không cần bảng DB mới.
  Xem [`backend/backend-design.md`](./backend/backend-design.md) mục 7.
  ⚠️ Việc này làm lỗi thời một phần tài liệu yêu cầu giao diện (màn hình Template Management, form nhập "Yêu cầu test").
