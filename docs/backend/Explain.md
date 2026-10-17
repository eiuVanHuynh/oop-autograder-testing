# Explain – `docs/backend/`

**Nội dung:** thiết kế của **backend dashboard trong repo này** (`backend/` ở repo root) – API phục vụ giao diện quản lý test.

> ⚠️ Không phải backend của website OOP AutoGrader. Backend đó là **đối tượng bị kiểm thử** và không có code trong repo này – xem [`../database/phan-biet-cac-loai-database.md`](../database/phan-biet-cac-loai-database.md) mục 4.

## File trong thư mục

| File | Là gì | Dùng khi |
| --- | --- | --- |
| [`backend-design.md`](./backend-design.md) | Chọn công nghệ, luồng chạy test qua GitHub Actions, cấu trúc thư mục `backend/src/`, quy ước request/response, secrets, thay đổi DB cần có, thứ tự làm | Trước khi viết dòng code backend đầu tiên |
| [`api-endpoints.md`](./api-endpoints.md) | Danh sách endpoint theo 11 nhóm chức năng, kèm quyền hạn, status code và giải thích thuật ngữ cho người mới | Khi code controller, hoặc khi frontend cần biết gọi API nào |

## Những điều đã chốt

- **Node.js (CommonJS) + Express**, deploy API lên **Vercel**; DB hiện tại là **MySQL** qua `mysql2` *(xem cảnh báo bên dưới)*.
- **Chạy test bằng GitHub Actions** (`workflow_dispatch`) – Vercel serverless không chạy được Playwright.
- **Log real-time dùng polling** `GET /runs/:id/logs?after=<seq>`, không dùng WebSocket; SSE chỉ khi chạy local.
- **Trạng thái một lần chạy được tính ra** từ dữ liệu có sẵn, không lưu cột `run_status` riêng.
- **Token reset mật khẩu không lưu trong DB** – JWT hạn 15 phút, ký kèm một phần `password_hash` hiện tại.
- Mọi endpoint bắt đầu bằng `/api`. Response: `{ data, meta? }` · Lỗi: `{ error: { code, message, details? } }`.
- Phân quyền chặn ở **cả FE (ẩn nút) lẫn BE (trả 403)**. Chỉ ẩn nút là chưa đủ.

## ⚠️ Chỗ `backend-design.md` không còn đúng

Nguồn chuẩn là [`../architecture/SRS.md`](../architecture/SRS.md) (kiến trúc, vai trò) và `db/schema/` (cấu trúc DB) –
xem [`../GIT_WORKFLOW.md`](../GIT_WORKFLOW.md) mục 9. Hai điểm trong `backend-design.md` đi ngược lại:

| Mục | `backend-design.md` viết | Theo nguồn chuẩn |
| --- | --- | --- |
| 6 – "Role `dev` = Viewer" | Bỏ `dev` khỏi ENUM, gộp vào `viewer` | **Giữ 4 vai trò.** SRS mục 4 và `db/schema/` đều có `dev` (Developer). Cần định nghĩa quyền `dev` cho đúng, không xóa. |
| 1 – Database MySQL qua `mysql2` | MySQL | **SRS ghi Supabase (PostgreSQL).** Code hiện là MySQL → khoảng cách cần thu hẹp, hoặc sửa SRS trước nếu nhóm quyết ở lại MySQL. |

Phần còn lại của `backend-design.md` (luồng GitHub Actions, polling, cấu trúc thư mục, quy ước response) vẫn còn hiệu lực.

## Những điều CHƯA chốt

- **Template**: bấm Run từ một template thì GitHub Actions chạy *những test nào*? 3 phương án (theo suite / theo tag / theo danh sách test case) ở [`backend-design.md`](./backend-design.md) mục 7. Trong lúc chờ, backend chừa sẵn trường `test_selector`.

## Quy tắc bảo trì

- Hai file này phải **khớp nhau**: thêm endpoint vào `api-endpoints.md` thì kiểm tra `backend-design.md` mục 6 xem có cần thay đổi DB không, và ngược lại.
- Mỗi endpoint phải ghi rõ **quyền hạn** và **status code** – đây là thứ frontend và người viết test dựa vào.
- Ưu tiên: 🔴 Cần thiết · 🟡 Tiềm năng. Khi làm xong một endpoint 🟡 thì cập nhật lại độ ưu tiên.
- Ma trận phân quyền ở Phụ lục A của `api-endpoints.md` phải khớp với [`../frontend/02-yeu-cau-giao-dien-v2.md`](../frontend/02-yeu-cau-giao-dien-v2.md) và `frontend/src/models/permissions.js`.
