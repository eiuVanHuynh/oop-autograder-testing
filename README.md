# OOP AutoGrader Testing

Hệ thống **kiểm thử tự động** cho website OOP AutoGrader: chọn một bộ test trên trang quản lý,
máy chủ đặt lệnh chạy, Playwright chạy test như người thật rồi đẩy kết quả về để xem báo cáo.

```
frontend/     Trang quản lý — React 19 + Vite + Tailwind
backend/      Máy chủ — Node + Express + PostgreSQL
automation/   Bộ test Playwright (chạy trên GitHub Actions hoặc tại máy)
db/           Schema, migration, seed
docs/         Tài liệu thiết kế (kiến trúc, API, database, quy trình git)
```

Luồng một lần chạy test: FE gọi `POST /runs` → backend lưu run và đặt lệnh cho runner →
runner đẩy log/kết quả về qua `/ingest/*` → FE hỏi log theo chu kỳ và hiện báo cáo.
Chi tiết: `docs/architecture/`, `docs/backend/api-endpoints.md`.

## Chạy tại máy

Cần **Node 20.19+** (Vite 8 yêu cầu vậy) và **PostgreSQL** (schema dùng `jsonb`, `array_position`).

### 1. Database

Lần đầu làm theo `db/SETUP-LOCAL.md` (cài Postgres, tạo user + database), rồi nạp schema và dữ liệu mẫu:

```bash
cd backend && cp .env.example .env     # điền DATABASE_URL và JWT_SECRET
cd .. && node migrate.js               # chạy ở gốc repo, đọc backend/.env
```

`migrate.js` chạy lại được: nó bỏ qua seed khi database đã có dữ liệu thật
(mốc: đã có ít nhất một dòng `test_runs`).

5 tài khoản mẫu dùng chung mật khẩu `Test@1234`: `admin@` `tester@` `dev@` `viewer@` `locked@`
(`@eiu.edu.vn`) — **chỉ dành cho môi trường dev**.

### 2. Máy chủ

```bash
cd backend && npm install && npm run dev      # http://localhost:5000/api
npm run routes                                # in ra toàn bộ endpoint đang sống
```

Biến môi trường: xem chú thích trong `backend/.env.example`. Hai biến bắt buộc là
`DATABASE_URL` và `JWT_SECRET`; thiếu là server không khởi động.

`RUNNER` quyết định ai chạy test:

| Giá trị | Nghĩa |
|---|---|
| `fake` | log + kết quả mô phỏng, không mở trình duyệt. Mặc định khi không có `GITHUB_TOKEN`. **Không dùng ở production.** |
| `playwright` | chạy Playwright thật trong tiến trình backend — **chỉ tại máy** (Vercel không có chromium) |
| `github` | gọi `workflow_dispatch` để GitHub Actions chạy |

### 3. Trang quản lý

```bash
cd frontend && npm install && npm run dev     # http://localhost:5173
```

`VITE_API_URL` trỏ tới backend, mặc định `http://localhost:5000/api`.

## Kiểm thử

```bash
cd backend  && npm test     # test máy chủ
cd frontend && npm run check && npm run lint && npm run build
```

Phần lớn test máy chủ dùng **repository giả / pg giả lập**, nên `npm test` chạy được mà
**không cần database**. Riêng `backend/tests/ingest.test.js` kiểm chính các câu SQL nên cần
PostgreSQL thật, và nó **tự bỏ qua** khi chưa khai `TEST_DATABASE_URL`. Muốn chạy cả phần đó:

```bash
# một database dùng xong bỏ, KHÔNG trỏ vào database thật: test này ghi và xoá dữ liệu
DATABASE_URL=postgresql://postgres:x@localhost:55432/test_automation_db node migrate.js
cd backend && TEST_DATABASE_URL=postgresql://postgres:x@localhost:55432/test_automation_db npm test
```

`frontend/npm run check` là bộ self-check cho `src/models/` — những quy tắc mà `lint` và `build`
không bắt được (khuôn dòng log, thứ tự chạy test case, escaping của báo cáo HTML).

## Vai trò

`Admin` làm được mọi thứ · `Tester` chạy test và quản lý template · `Dev` xem, **không được chạy test** ·
`Viewer` chỉ xem. Tài khoản mới tự đăng ký luôn là `Viewer`, trạng thái `Active`.

## Góp code

Quy trình nhánh và commit: `docs/GIT_WORKFLOW.md`. Nhánh làm việc hiện tại là
`original/dev/front-end` và `original/dev/back-end`; `main` là nhánh chính.
