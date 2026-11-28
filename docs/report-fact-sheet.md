# Report Fact Sheet — nguồn số liệu chuẩn cho `main.pdf`

> Lập cho issue **A1**. Số liệu đếm trên **repo gộp theo A3**: `frontend/` lấy từ nhánh **front-end**, `backend/` lấy từ nhánh **back-end** (hai nhánh có `backend/`, `db/`, `automation/` giống hệt nhau; `docs/diagrams/` giữ từ nhánh front-end). Khác biệt duy nhất ngoài `frontend/`: `.gitignore` của nhánh front-end thêm `.archify/`.
> Khi report và tài liệu khác nhau, **file này thắng**. Khi repo đổi, đếm lại rồi sửa file này trước, sửa report sau.
> Cột "Cách kiểm" cho biết lệnh để đếm lại.

## 1. Số liệu chuẩn

| Hạng mục | Giá trị chuẩn | Cách kiểm |
|---|---|---|
| Số test case | **31** (TC-01 → TC-31) | `grep -c "^| \*\*TC-" docs/testing/test-case-matrix.md` |
| Mã TC khác nhau trong `001_srs_test_cases.sql` | **31**, không có dòng rác `TC-` | `grep -o "'TC-[0-9]*'" db/migrations/001_srs_test_cases.sql \| sort -u \| wc -l` |
| Số FR của SUT | **16** (FR-1 → FR-16) | `docs/testing/fr-mapping.md` |
| Fixture nộp bài | **13** thư mục | `ls automation/fixtures/submissions` |
| Fixture CSV/TXT | **5** (batch1, duplicate, empty, invalid_rows, wrong_format.txt) | `ls automation/fixtures/*.csv automation/fixtures/*.txt` |
| Tổng fixture | **18** (13 + 5) | |
| Bảng DB | **16** | `users, test_suites, test_specs, test_cases, test_steps, test_data, test_runs, test_results, test_evidences, reports, pages, items, page_items, test_templates, run_logs, bugs` |
| File migration | **13** file (001, 002, 004–013; **hai file `010_`**; **không có 003**) | `ls db/migrations` |
| Endpoint đang chạy | **55** (`/api/...`) | `cd backend && npm ci && npm run routes` |
| Endpoint chưa có | `/api/stats`, `/api/reports` đã mount nhưng controller rỗng | cuối output `npm run routes` |
| Test backend | **81** lời gọi `it/test` trong **6** file (số tĩnh; số pass/fail thật lấy ở B4) | `cd backend && npm test` |
| Frontend `npm run check` | 5 script: steps, runlog, report, searchtags, caseorder | `frontend/package.json` |
| View frontend | **13** file | `ls frontend/src/views` |
| Route frontend | **17** route có `path` (+ 2 route layout; 19 phần tử `<Route>`) | `frontend/src/routes/AppRoutes.jsx` |
| Sơ đồ có sẵn | **7** file HTML trong `docs/diagrams/` (chỉ nhánh front-end) + `docs/architecture/diagram.mmd`, `data-flow-capstone.drawio`, `context-and-sequence-diagram.html` | |
| Commit SUT dùng để đối chiếu | `b17d855` | `docs/testing/sut-reference.md` |

Endpoint theo nhóm (tổng 55): catalog 23 · runs 7 · users 7 · templates 6 · ingest 5 · auth 2 · bugs 2 (`GET /bugs`, `PATCH /bugs/:id`) · results 1 (`POST /results/:id/bugs`) · health 1 · meta 1.
README đang ghi 54 → sửa thành 55 (hoặc ghi "xem `npm run routes`").

### Phiên bản công cụ (lấy từ file khoá, không lấy từ trí nhớ)

| Thành phần | Phiên bản | Nguồn |
|---|---|---|
| Playwright (`@playwright/test` và `playwright`) | **1.63.0** (`package.json` ghi `^1.63.0`) | `automation/package-lock.json` |
| Node trên GitHub Actions | **20** | `.github/workflows/run-tests.yml` |
| Frontend nền tảng | React **^19.2.8**, Vite **^8.3.0**, Tailwind **^3.4.19**, axios ^1.20.0 | `frontend/package.json` |
| Backend nền tảng | Express **^4.21.2**, `pg` ^8.13.1, `jsonwebtoken` ^9.0.2 | `backend/package.json` |
| Database | PostgreSQL (Supabase), không phải MySQL | `db/schema/`, issue C6 |

Ghi chú trạng thái: phần "Quyết định" ở mục 3 và 5 phản ánh lựa chọn của nhóm ngày 28/11/2026.

Lưu ý: React 19 là của **nền tảng test**. "React 18 / Spring Boot 3.2.2" trong report 2.1.1 là mô tả **SUT**, repo này không kiểm chứng được (issue E2).

## 2. Trạng thái test case × dữ liệu steps (cho A2/E9)

| Nhóm | TC | Steps trong DB | Cách chạy | Ghi chú |
|---|---|---|---|---|
| Auth & User | TC-01, 02, 06, 08–12 | Có (`002`) | Tự động qua `plan.spec.js` | 8 TC |
| Auth thủ công | TC-03, 04, 05, 07 | Có (`002`), nhưng chạy tay | Thủ công (OAuth/email) | 4 TC, biên bản trong `docs/manual-tests/` |
| Role guard | TC-31 | Có (`002`) | Tự động | Nhóm Lecturer theo ma trận nhưng steps nằm ở `002` |
| Submission | TC-13–22 | **Không có** (thiếu `003`) | Chưa chạy được | 10 TC, issue C1 |
| Lecturer | TC-28, 29, 30 | Có (`004`), đúng mã | Chưa có evidence chạy | |
| Lecturer | TC-23–27 | Có (`004`) nhưng **sai nội dung** | Chưa chạy được | Xem mục 3, phát hiện mới |

Tóm tắt: 31 TC = 13 có steps trong `002` (9 tự động gồm TC-31 + 4 thủ công) + 3 có steps hợp lệ trong `004` + 5 có steps sai mã (TC-23–27) + 10 chưa có steps (TC-13–22).
Trạng thái Pass/Fail **chưa có số liệu thật** cho tới khi xong B2/B3, nên report chưa được ghi tỷ lệ pass.

## 3. Kết quả kiểm chứng 9 mâu thuẫn của A1

| # | Mâu thuẫn | Kết luận | Sửa trong report |
|---|---|---|---|
| 1 | Playwright `v1.64.1` (6.1) | **Đúng là mâu thuẫn.** Khoá ở `1.63.0` (`package.json` ghi `^1.63.0`) | 6.1 và 4.4.1: ghi **1.63.0** |
| 2 | Doc nhắc `auth.spec.js`, `submission.spec.js`, `tests/lecturer/` | **Đúng.** Chỉ có `automation/tests/srs/plan.spec.js` (đọc `test_steps` từ DB) | 4.1.5, 5.2.1, 5.4.2, 6.2.1: bỏ tên spec riêng; mô tả "một spec diễn giải chung `plan.spec.js`". Doc `test-case-matrix.md` dòng 13–15 cũng cần sửa |
| 3 | 5.2.1: TC-13–22 "automated với hard-coded steps" | **Đúng là mâu thuẫn.** Không có spec hard-code; `003_submission_steps_data.sql` không tồn tại nên chưa có steps | 5.2.1: "chưa có steps trong DB, chưa chạy" |
| 4 | 5.2.1 xếp TC-31 vào nhóm Lecturer | **Đúng.** Steps của TC-31 nằm trong `002_auth_steps_data.sql` | 5.2.1: TC-31 thuộc nhóm "steps trong `002`" (tự động) dù về nghiệp vụ vẫn là Lecturer |
| 5 | `004` còn mã TC-34..TC-38 | **Chỉ đúng một phần.** Chúng chỉ nằm trong **comment** đầu file, không có dòng `test_cases` nào mang mã này. Vấn đề thật: steps của TC-23–27 trong `004` là luồng Sinh viên, gắn nhầm mã (file `007_fix_tc_code_conflict.sql` mà comment hứa viết không tồn tại) | Report vẫn dùng **31 TC**; 5.2.1 ghi TC-23–27 "steps chưa đúng nghiệp vụ, chưa chạy". Việc sửa dữ liệu thuộc C2 |
| 6 | FR-3 mô tả "tên, IRN, ngày sinh, mật khẩu" (3.2.2/5.2.2) | **Đúng.** Form chỉ có IRN, Password, Confirm Password (`test-case-matrix.md` dòng 29). `fr-mapping.md` dòng 14 cũng còn ghi sai | 3.2.2, 5.2.2: "IRN, Password, Confirm Password". Sửa luôn `fr-mapping.md` |
| 7 | Typo `TC04` (5.3.2) | **Không thấy trong PDF** (hiện "TC-04", xuống dòng ở dấu gạch) | Tìm `TC04` trong file nguồn và thay bằng `TC-04` |
| 8 | 4.1.4 "Supabase Storage buckets cho screenshot" | **Đúng tại thời điểm kiểm tra.** `ingest.routes.js` dòng 30 ghi evidence bị bỏ có chủ đích; không có upload nào trong `backend/src` | **Quyết định: làm evidence (B1a).** Report giữ các câu "screenshot evidence". Sau khi B1 xong, kiểm lại 4.1.4, 4.1.5, 4.2.3, 5.1.2, 6.1 khớp cách lưu ảnh thật (nếu không dùng Supabase Storage thì sửa 4.1.4) |
| 9 | 4.3.1 "Bug Tracker" | **Đúng.** Không có view/route nào về bug (13 view, 17 route); backend có bảng `bugs` + 3 endpoint (`GET /bugs`, `PATCH /bugs/:id`, `POST /results/:id/bugs`) | **Quyết định: không làm giao diện (C3b).** Đã bỏ Bug Tracker khỏi 4.3.1; 1.4.1, 3.1.2, 4.4.2 chỉ nói "defect-reporting API"; giao diện Bug Tracker chuyển vào Future Works (6.2.2) |

## 4. Số liệu để report dùng (đối chiếu nhanh)

Report phải dùng đúng: **31 TC**, **16 FR**, **18 fixtures** (13 + 5), **16 bảng DB**, **55 endpoint**, **13 view / 17 route**, Playwright **1.63.0**, Node **20**, nhóm TC theo mục 2.

## 5. Phát hiện ngoài phạm vi A1 (chuyển cho issue khác)

- **C2:** steps TC-23–27 sai mã (mục 3, dòng 5).
- **C5:** tại thời điểm kiểm tra, UI và backend chỉ cho Admin/Tester chạy và rerun; Dev chỉ được `POST /results/:id/bugs`, trong khi SRS và ghi chú `permissions.js` cho Dev request rerun. **Quyết định: sửa code cho Dev được rerun** (backend `runs.routes.js` dòng 41, frontend `permissions.js` thêm `canRerunTest`). Khi xong, viết 3.1.1 theo hành vi mới.
- **C4:** `/api/stats` và `/api/reports` đã mount nhưng controller rỗng; README ghi 54 endpoint, thực tế 55.
- **A2:** không tìm thấy dòng rác `TC-` trong `001`; có đúng 31 mã TC-01..TC-31.
- **Report:** `main.pdf` hiện chỉ có phần khung; việc sửa phải áp vào file nguồn (LaTeX/Overleaf).

## 6. Nhật ký kiểm tra

- Nguồn: repo gộp (`frontend/` từ nhánh front-end, `backend/` từ nhánh back-end, đã `diff -r` xác nhận khớp nhánh gốc) và `main.pdf` (23 trang).
- `npm run routes` chạy thật sau `npm ci` trong `backend/`. Chưa chạy `npm test`, `npm run check`, Playwright (thuộc B2/B4).
