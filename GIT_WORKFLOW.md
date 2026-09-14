# OOP AutoGrader — Test Automation Repo: Cấu trúc & Quy trình làm việc nhóm

## 1. Cấu trúc thư mục repo

Repo này **tách biệt hoàn toàn** với source code sản phẩm OOP AutoGrader — chỉ chứa
DB test riêng (`test_automation_db`), test case, và Playwright spec.

```
oop-autograder-testing/
├── .github/
│   └── workflows/
│       └── playwright-ci.yml        # CI: chạy Playwright + ghi kết quả vào test_runs/test_results
│
├── db/
│   ├── schema/
│   │   └── test_automation_db_schema.sql   # 6 bảng: test_suites, test_cases, test_specs,
│   │                                        # test_runs, test_results, test_data
│   ├── migrations/                   # mỗi thay đổi schema = 1 file, đánh số tăng dần
│   │   └── 0001_init.sql
│   └── seed/                         # dữ liệu mẫu cho từng suite (login, upload, ...)
│       └── seed_auth_suite.sql
│
├── docs/
│   ├── test-plan.md                  # phạm vi kiểm thử, 3 phân hệ, tiêu chí pass/fail
│   ├── test-case-matrix.xlsx         # bảng TC-01 → TC-44 (đã có)
│   └── fr-mapping.md                 # bảng đối chiếu FR-1..FR-16 <-> suite/test case
│
├── tests/                             # Playwright spec, chia theo đúng 3 phân hệ
│   ├── auth/
│   │   ├── login-google.spec.ts       # TC-01, TC-02, TC-03
│   │   ├── login-irn.spec.ts          # TC-04, TC-05, TC-06
│   │   ├── forgot-password.spec.ts    # TC-07 → TC-10
│   │   └── user-roster.spec.ts        # TC-11 → TC-14
│   ├── student/
│   │   ├── upload.spec.ts             # TC-15 → TC-19
│   │   ├── declaration-test-tab.spec.ts # TC-20, TC-21, TC-22
│   │   ├── mmd-diagram-tab.spec.ts    # TC-23, TC-24
│   │   ├── testcase-tab.spec.ts       # TC-25, TC-26
│   │   └── submission-history.spec.ts # TC-27
│   ├── lecturer/
│   │   ├── grading-dashboard.spec.ts  # TC-28
│   │   ├── grade-matrix.spec.ts       # TC-29 → TC-31
│   │   ├── solution-management.spec.ts# TC-32 → TC-39
│   │   └── user-management.spec.ts    # TC-40 → TC-44
│   ├── fixtures/
│   │   └── auth.fixture.ts            # login helper dùng chung (student/lecturer session)
│   └── utils/
│       ├── db-client.ts               # kết nối test_automation_db, query test_specs trước expect()
│       └── result-reporter.ts         # ghi kết quả chạy vào test_runs/test_results sau mỗi lần test
│
├── playwright.config.ts
├── package.json
├── .env.example                       # TEST_DB_URL, BASE_URL, PW_BROWSER=chromium
├── .gitignore                          # node_modules, test-results/, playwright-report/, .env
└── README.md                           # hướng dẫn cài đặt & chạy test cho thành viên mới
```

**Vì sao chia `tests/` theo 3 phân hệ (auth / student / lecturer)?** Đúng theo cách bạn đã
phân nhóm 44 test case — mỗi thư mục ánh xạ 1-1 với 1 `module_group` trong bảng
`test_suites`, giúp map trực tiếp: `suite_name` → tên thư mục → tên file `.spec.ts`.

---

## 2. Chiến lược nhánh (Branching)

```
main            ← luôn chạy được, bảo vệ (protected), chỉ merge qua Pull Request
 └─ dev         ← nhánh tích hợp, các feature merge vào đây trước khi lên main
     ├─ test/auth-login-google       (TC-01..03)
     ├─ test/auth-irn-login          (TC-04..06)
     ├─ test/student-upload          (TC-15..19)
     ├─ test/lecturer-solution-mgmt  (TC-32..39)
     └─ fix/db-schema-testspecs-typo
```

- **`main`**: bảo vệ bằng branch protection rule — bắt buộc PR + tối thiểu 1 review + CI (Playwright) phải pass mới merge được.
- **`dev`**: nơi cả nhóm gộp code hằng ngày, chạy CI thường xuyên hơn `main`.
- **Nhánh tính năng**: đặt tên `<loại>/<phân-hệ>-<mô-tả-ngắn>`
  - `test/...` — thêm test case mới
  - `db/...` — thay đổi schema/migration
  - `fix/...` — sửa lỗi
  - `docs/...` — cập nhật tài liệu

## 3. Quy ước Commit

Dùng **Conventional Commits**, luôn gắn mã Test ID để dễ truy vết:

```
test(auth): add TC-05 wrong password case
db(schema): add extra_attributes column to test_specs
fix(student): correct selector for dropzone upload TC-16
docs(test-plan): update FR mapping table
```

## 4. Phân công theo module (khớp 3 phân hệ đã thiết kế)

| Phân hệ | Thư mục phụ trách | Số TC | Gợi ý phân công |
|---|---|---|---|
| Xác thực & Quản lý Người dùng | `tests/auth/` | TC-01→14 | 1 thành viên chuyên Auth |
| Nộp bài & Chấm điểm (Sinh viên) | `tests/student/` | TC-15→27 | 1-2 thành viên (nhiều tab kết quả) |
| Quản lý của Giảng viên | `tests/lecturer/` | TC-28→44 | 1-2 thành viên (nhiều màn hình nhất) |
| DB schema & CI | `db/`, `.github/` | — | 1 thành viên phụ trách hạ tầng chung |

Mỗi người **chỉ merge vào `dev` qua PR**, không push thẳng để tránh đè code nhau lên `test_specs` seed data.

## 5. Quy trình Pull Request

1. Tạo issue trên GitHub (hoặc Project board) cho từng nhóm TC, gắn nhãn `auth` / `student` / `lecturer` / `db`.
2. Tạo nhánh từ `dev`, code + viết spec Playwright tương ứng.
3. Chạy local: `npx playwright test tests/auth/` trước khi push.
4. Mở PR vào `dev`, mô tả PR liệt kê rõ **Test ID** được cover (vd "Covers TC-04, TC-05, TC-06").
5. CI tự động chạy toàn bộ suite liên quan + ghi log vào `test_runs`/`test_results`.
6. Ít nhất 1 người review — ưu tiên người phụ trách phân hệ khác review chéo để phát hiện selector/spec sai.
7. Merge bằng "Squash and merge" để lịch sử `dev` gọn gàng.
8. Định kỳ (vd cuối mỗi sprint) merge `dev` → `main` khi toàn bộ suite pass.

## 6. CI/CD (GitHub Actions) — vai trò

`.github/workflows/playwright-ci.yml` nên:
1. Checkout code, cài dependencies (`npm ci`), cài Playwright browsers.
2. Khởi tạo `test_automation_db` (chạy `db/schema/*.sql` + seed) trên service container Postgres.
3. Chạy `npx playwright test --reporter=json`.
4. Script `tests/utils/result-reporter.ts` đọc report JSON, insert vào `test_runs` (kèm `git_commit`, `git_branch` lấy từ biến môi trường CI) và `test_results` (kèm `screenshot_path`/`video_path` là artifact URL của CI).
5. Upload `playwright-report/` làm CI artifact để xem lại khi fail.
6. Nếu `failed_count > 0` → PR check "fail", chặn merge.

## 7. File cấu hình quan trọng

**`.env.example`**
```
BASE_URL=https://autograder-staging.vercel.app
TEST_DB_URL=postgresql://user:password@localhost:5432/test_automation_db
PW_BROWSER=chromium
```

**`.gitignore`** (tối thiểu)
```
node_modules/
test-results/
playwright-report/
.env
*.log
```

## 8. Vòng đời dữ liệu test (đồng bộ code ↔ DB)

- `db/schema/` và `db/migrations/` **luôn commit vào Git** — không sửa DB thủ công ngoài migration, để cả nhóm luôn có schema giống nhau khi `git pull`.
- `test_cases` / `test_specs` seed data nên tách theo suite (`seed_auth_suite.sql`, `seed_student_suite.sql`...) trùng với thư mục `tests/`, để khi 1 người thêm test case Auth, họ chỉ cần sửa đúng 1 file seed, tránh conflict với người làm Student/Lecturer.
- Mỗi lần `npx playwright test` local cũng nên trỏ vào 1 `test_automation_db` riêng (docker-compose local), không dùng chung DB CI, tránh ghi đè `test_runs` của nhau.
