\# OOP AutoGrader — Test Automation Repo: Cấu trúc \& Quy trình làm việc nhóm



\## 1. Cấu trúc thư mục repo



Repo này \*\*tách biệt hoàn toàn\*\* với source code sản phẩm OOP AutoGrader. Repo gồm 3 phần chính:



\- `automation/`: kiểm thử tự động bằng Node.js + Playwright, ghi kết quả vào MySQL.

\- `backend/` + `frontend/`: dashboard quản lý test case, lần chạy, kết quả, bug (mô hình MVC, deploy lên Vercel).

\- `db/`: schema, migration, dữ liệu mẫu của `test\_automation\_db`.



```

oop-autograder-testing/

├── .github/

│   └── workflows/                      # CI: playwright-ci.yml (sẽ bổ sung)

│

├── automation/                         # Kiểm thử tự động (Node.js + Playwright)

│   ├── tests/                          # Spec, chia theo phân hệ

│   │   ├── auth/                       # auth.spec.js, auth-db.spec.js

│   │   ├── submission/                 # submission.spec.js

│   │   ├── student/                    # (sẽ bổ sung: TC-15 → TC-27)

│   │   ├── lecturer/                   # (sẽ bổ sung: TC-28 → TC-44)

│   │   ├── db/                         # db-connection.spec.js

│   │   ├── fixtures/                   # auth.fixture.js: login helper dùng chung (CODE)

│   │   ├── models/                     # \*.model.js: class mô tả dữ liệu test

│   │   └── utils/                      # db-client.js: kết nối MySQL

│   ├── reporters/

│   │   ├── test-result-logger.js       # Ghi kết quả vào test\_runs / test\_results

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

│   │   └── test\_automation\_db\_schema.sql   # test\_suites, test\_cases, test\_specs, test\_steps,

│   │                                        # test\_data, test\_runs, test\_results, bug\_feedbacks

│   ├── migrations/                     # Mỗi thay đổi schema = 1 file, đánh số tăng dần

│   └── seed/

│       └── seed.sql                    # Dữ liệu mẫu (suite, test case, spec, step, data)

│

├── docs/

│   ├── GIT\_WORKFLOW.md                 # File này

│   ├── test-plan.md                    # Phạm vi kiểm thử, 3 phân hệ, tiêu chí pass/fail

│   ├── test-case-matrix.md             # Bảng TC-01 → TC-44

│   └── fr-mapping.md                   # Đối chiếu FR-1..FR-16 <-> suite / test case

│

├── .env                                # Cấu hình local, KHÔNG commit

├── .env.example                        # Mẫu biến môi trường (giá trị giả)

├── .gitignore

├── .gitattributes

└── README.md                           # (sẽ bổ sung) hướng dẫn cài đặt \& chạy test

```



\*\*Hai thư mục `fixtures` khác nhau:\*\*

\- `automation/tests/fixtures/` chứa \*\*code\*\* fixture của Playwright (login helper).

\- `automation/fixtures/` chứa \*\*file dữ liệu\*\* dùng để upload khi test (CSV, bài `.java`, `.mmd`).



\*\*Vì sao chia `tests/` theo 3 phân hệ (auth / student / lecturer)?\*\* Mỗi thư mục ánh xạ 1-1 với một `module\_group` trong bảng `test\_suites`, giúp map trực tiếp: `suite\_name` → tên thư mục → tên file `.spec.js`.



\---



\## 2. Chiến lược nhánh (Branching)



```

main            ← luôn chạy được, được bảo vệ, chỉ merge qua Pull Request

&#x20;└─ dev         ← nhánh tích hợp, các nhánh tính năng merge vào đây trước khi lên main

&#x20;    ├─ test/auth-login-irn

&#x20;    ├─ test/student-upload

&#x20;    ├─ db/cloud-ready

&#x20;    └─ fix/db-table-name-case

```



\- \*\*`main`\*\*: bảo vệ bằng branch protection: bắt buộc PR + tối thiểu 1 review (+ CI pass khi đã có workflow).

\- \*\*`dev`\*\*: nhánh tích hợp hằng ngày. \*\*Không commit thẳng\*\*, chỉ merge qua PR.

\- \*\*Nhánh tính năng\*\* đặt tên `<loại>/<mô-tả-ngắn>`:

&#x20; - `test/...`: thêm / sửa test case, spec

&#x20; - `db/...`: thay đổi schema, migration, seed

&#x20; - `fix/...`: sửa lỗi

&#x20; - `docs/...`: cập nhật tài liệu

&#x20; - `refactor/...`: tổ chức lại cấu trúc, không đổi hành vi

&#x20; - `feat/...`: tính năng mới của dashboard (backend / frontend)

&#x20; - `chore/...`: việc vặt (cấu hình, dependencies)



\## 3. Quy ước Commit



Dùng \*\*Conventional Commits\*\*, gắn mã Test ID khi liên quan đến test case để dễ truy vết:



```

test(auth): add TC-05 wrong password case

db(schema): use lowercase table names

fix(student): correct selector for dropzone upload TC-16

docs(git-workflow): update repo structure

refactor: reorganize repo into automation, backend, frontend

feat(backend): add test run controller

chore: update .gitignore

```



\## 4. Phân công theo module



| Phân hệ | Thư mục phụ trách | Số TC | Gợi ý phân công |

|---|---|---|---|

| Xác thực \& Quản lý người dùng | `automation/tests/auth/` | TC-01 → 14 | 1 thành viên chuyên Auth |

| Nộp bài \& Chấm điểm (Sinh viên) | `automation/tests/student/`, `submission/` | TC-15 → 27 | 1-2 thành viên |

| Quản lý của Giảng viên | `automation/tests/lecturer/` | TC-28 → 44 | 1-2 thành viên |

| Dashboard (backend + frontend) | `backend/`, `frontend/` | — | 1-2 thành viên |

| DB schema \& CI | `db/`, `.github/` | — | 1 thành viên phụ trách hạ tầng chung |



Mỗi người \*\*chỉ merge vào `dev` qua PR\*\*, không push thẳng để tránh đè code nhau (đặc biệt là file seed).



\## 5. Quy trình Pull Request



1\. Tạo issue trên GitHub (hoặc Project board) cho từng nhóm TC, gắn nhãn `auth` / `student` / `lecturer` / `db` / `dashboard`.

2\. Cập nhật `dev` (Fetch / Pull), tạo nhánh từ `dev`, code + viết spec Playwright tương ứng.

3\. Chạy local trước khi push:

&#x20;  ```bash

&#x20;  cd automation

&#x20;  npx playwright test tests/auth/

&#x20;  ```

4\. Mở PR vào `dev`, mô tả liệt kê rõ \*\*Test ID\*\* được cover (vd "Covers TC-04, TC-05, TC-06").

5\. CI tự động chạy suite liên quan (khi đã có workflow).

6\. Ít nhất 1 người review, ưu tiên người phụ trách phân hệ khác review chéo để phát hiện selector / spec sai.

7\. Merge bằng \*\*Squash and merge\*\* để lịch sử `dev` gọn.

8\. Sau khi merge: xóa nhánh cũ, các nhánh khác đang làm dở \*\*Branch → Update from dev\*\*.

9\. Định kỳ (cuối mỗi sprint hoặc khi cần nộp) mở PR `dev` → `main` khi toàn bộ suite pass.



\## 6. CI/CD (GitHub Actions)



`.github/workflows/playwright-ci.yml` (sẽ bổ sung) nên:



1\. Checkout code, `npm ci` trong thư mục `automation/` (dùng `working-directory: automation`).

2\. Cài trình duyệt: `npx playwright install --with-deps chromium`.

3\. Khởi tạo DB: dùng MySQL (service container hoặc DB cloud), chạy `db/schema/\*.sql` rồi `db/seed/\*.sql`.

4\. Chạy `npx playwright test`. Biến `CI=true` sẽ tự bật chế độ headless (xem `playwright.config.js`).

5\. `test-result-logger.js` ghi kết quả vào `test\_runs` / `test\_results`.

6\. Upload `automation/test-results/` (và `playwright-report/` nếu bật HTML reporter) làm artifact để xem lại khi fail.

7\. Nếu có test fail → PR check "fail", chặn merge.



Thông tin nhạy cảm (mật khẩu DB, tài khoản test) lưu trong \*\*GitHub Secrets\*\*, không ghi vào workflow hay code.



\## 7. File cấu hình quan trọng



\*\*`.env`\*\* đặt ở \*\*thư mục gốc\*\* (`playwright.config.js` đọc `../.env`), không commit. Mẫu trong `.env.example`:



```

BASE\_URL=https://oop-autograder.vercel.app

PW\_BROWSER=chromium



TEST\_STUDENT\_IRN=20210000

TEST\_STUDENT\_PASSWORD=your\_student\_password

TEST\_LECTURER\_IRN=lecturer.example

TEST\_LECTURER\_PASSWORD=your\_lecturer\_password

TEST\_RESET\_TOKEN=



DB\_HOST=localhost

DB\_PORT=3306

DB\_USER=your\_db\_user

DB\_PASSWORD=your\_db\_password

DB\_NAME=test\_automation\_db

DB\_SSL=false

```



\*\*`.gitignore`\*\* (tối thiểu):



```

node\_modules/

.env

test-results/

playwright-report/

\*.log

```



\*\*Deploy lên Vercel:\*\* tạo \*\*2 project\*\* từ cùng repo, một project đặt \*Root Directory\* = `frontend`, một project đặt \*Root Directory\* = `backend`. Biến môi trường (DB, CORS...) cấu hình ở phần Environment Variables của từng project. Thư mục `automation/` \*\*không\*\* deploy lên Vercel (Playwright cần trình duyệt, chạy bằng GitHub Actions hoặc máy local).



\## 8. Vòng đời dữ liệu test (đồng bộ code ↔ DB)



\- `db/schema/` và `db/migrations/` luôn commit vào Git. \*\*Không sửa DB thủ công\*\* ngoài migration để cả nhóm có schema giống nhau.

\- \*\*Schema\*\* tạo cấu trúc; \*\*seed\*\* nhập dữ liệu mẫu (suite, test case, spec, step, data); \*\*migration\*\* là thay đổi cấu trúc về sau. Thứ tự chạy: schema → seed.

\- Với DB cloud: schema dùng `CREATE TABLE IF NOT EXISTS` (không `DROP TABLE`), không có `CREATE DATABASE` / `USE`; seed chỉ chạy một lần trên DB trống (không `DELETE` dữ liệu đang có).

\- `test\_runs` và `test\_results` \*\*không\*\* nằm trong seed vì do Playwright tự ghi mỗi lần chạy.

\- Seed nên tách theo suite (`seed\_auth\_suite.sql`, `seed\_student\_suite.sql`...) trùng với thư mục `tests/`, để mỗi người chỉ sửa đúng file của mình, tránh conflict.

\- Chạy local nên trỏ vào một DB riêng (vd MySQL trong Docker), không dùng chung DB với CI hoặc DB cloud chung, tránh ghi đè `test\_runs` của nhau.



\## 9. Việc cần thống nhất trong nhóm



\- \*\*Quy ước tên bảng\*\*:Viết hoa, ví dụ Test\_Cases, Test\_Data, cho đồng bộ thay vì test\_cases, test\_data

\- \*\*Bộ mã test case\*\*: hiện seed dùng `TC-AUTH-xxx`, spec và docs dùng `TC-01 → TC-44`. Chọn một bộ mã duy nhất cho cả `docs/`, seed và tiêu đề test.

\- \*\*DB cloud\*\*: chọn nhà cung cấp, cấu hình SSL, tạo user riêng (không dùng `root`).

