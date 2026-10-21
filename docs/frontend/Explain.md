# Explain – `docs/frontend/`

**Nội dung:** yêu cầu giao diện cho dashboard quản lý test (`frontend/` ở repo root – React + Vite).

## File trong thư mục

| File | Là gì | Trạng thái |
| --- | --- | --- |
| [`01-yeu-cau-giao-dien-v1.md`](./01-yeu-cau-giao-dien-v1.md) | Bản mô tả ban đầu: 6 nhóm màn hình, luồng người dùng | Bản cũ, giữ để tham khảo |
| [`02-yeu-cau-giao-dien-v2.md`](./02-yeu-cau-giao-dien-v2.md) | Bản chi tiết hơn: có route cụ thể (`/login`, `/dashboard`, `/tests/new`, `/runs/:id`, `/templates`, `/history`, `/admin/users`), **ma trận phân quyền**, lưu ý triển khai, danh sách màn hình UI/UX | Bản cũ, phần chữ đã gộp nguyên vào v3 |
| [`03-yeu-cau-giao-dien-v3.md`](./03-yeu-cau-giao-dien-v3.md) | = v2 về chữ, **cộng 11 ảnh thiết kế** trong [`design/`](./design) và link Design.md. Chốt thương hiệu **OOP Grader**, tông indigo `#4f46e5` | ✅ **Bản được ưu tiên khi có mâu thuẫn** |
| [`design/`](./design) | 11 ảnh PNG tách từ base64 nhúng trong file gốc `Capstone.md` | Nguồn hình duy nhất, đừng nhúng lại base64 vào md |

## Màn hình cần làm

`Login` · `Register` · `Forgot password` · `Dashboard` · `Create new test` · `RunDetail` · `Test History` · `Template Management` · `User Management` · `403 Unauthorized`

**Nếu thiếu thời gian:** ưu tiên Login/Register → Tạo & Chạy Test → Kết quả & Báo cáo → Lịch sử. Làm sau: Quản lý Template và tab Quản lý thành viên.

## Bốn vai trò

Nguồn chuẩn về vai trò là [`../architecture/SRS.md`](../architecture/SRS.md) mục 4, khớp với `ENUM('admin','tester','dev','viewer')` trong `db/schema/`:

| Chức năng | Admin | Tester | Dev | Viewer |
| --- | :-: | :-: | :-: | :-: |
| Xem Dashboard, Lịch sử, Báo cáo, Template | ✔ | ✔ | ✔ | ✔ |
| Xem log, chuỗi bước chi tiết, bằng chứng | ✔ | ✔ | ✔ | ✔ |
| Request chạy lại | ✔ | ✔ | ✔ | ✘ |
| Run / Hủy | ✔ | ✔ | ✘ | ✘ |
| Thêm, sửa, xóa Template | ✔ | ✔ | ✘ | ✘ |
| Quản lý thành viên | ✔ | ✘ | ✘ | ✘ |

Tài khoản mới mặc định là **Viewer**.

> ⚠️ **Hai việc còn phải làm:**
> 1. v2 và v3 đều chỉ mô tả **3 vai trò** (thiếu `Dev`) → cần bổ sung.
> 2. `frontend/src/models/permissions.js` đang xếp `Dev` vào `WRITE_ROLES`, tức ngang `Tester` – **rộng hơn SRS cho phép**.
>    Theo SRS, `Dev` chỉ được xem và *request* chạy lại, không được tạo/sửa/xóa Template hay tự chạy test.
>
> Lưu ý: điều này **đảo lại** đề xuất bỏ `dev` ở [`../backend/backend-design.md`](../backend/backend-design.md) mục 6.
> Nguồn chuẩn (SRS + schema) đều giữ `dev`, nên giữ. Nếu nhóm muốn bỏ thật thì **sửa SRS và schema trước**.

## Quy tắc bảo trì

- **Ẩn nút là chưa đủ.** Mọi hạn chế quyền trên giao diện phải có 403 tương ứng ở backend.
- Ma trận phân quyền ở v2, Phụ lục A của [`../backend/api-endpoints.md`](../backend/api-endpoints.md) và `permissions.js` phải khớp nhau **và khớp với SRS mục 4**. Cả ba hiện đều thiếu/sai vai trò `Dev`.
- **Không tự chế dữ liệu giả** rồi mới ghép API. Dùng đúng hợp đồng trong `api-endpoints.md` (trạng thái, tên trường, status code) – đây là lỗi đã mắc phải một lần, ghi lại trong [`../parallel/AGENT_BRIEF.md`](../parallel/AGENT_BRIEF.md) mục 3.7.
- Hằng số trạng thái: frontend dùng chữ HOA (`PASSED`), DB dùng chữ thường (`passed`). Chuyển đổi **chỉ ở một chỗ** (`backend/src/utils/mappers.js`).
- Khi có bản yêu cầu giao diện mới thì tạo `04-…md`, **không sửa đè** v1/v2/v3, và cập nhật cột *Trạng thái* ở bảng trên.
- Ảnh thiết kế để trong `design/` dạng PNG rời. File md có ảnh base64 nhúng (1.3 MB, diff không đọc được) thì tách ảnh ra trước khi commit.
