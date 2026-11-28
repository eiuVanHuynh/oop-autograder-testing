# Explain – `docs/database/`

**Nội dung:** mọi thứ liên quan tới dữ liệu kiểm thử – giải thích khái niệm và phân công công việc cụ thể.

> 📌 **Nguồn chuẩn về cấu trúc DB là `db/schema/test_automation_db_schema.sql`** (tên bảng, tên cột, kiểu, CHECK).
> Seed và migration phải theo schema, không ngược lại.
>
> ✅ **Khoảng cách MySQL ↔ PostgreSQL đã đóng.** Schema hiện là **PostgreSQL/Supabase**, tên bảng viết thường
> (`test_suites`, `test_steps`…), `ENUM` đổi thành `VARCHAR + CHECK`, `DATETIME` → `TIMESTAMPTZ` – khớp
> [`../architecture/SRS.md`](../architecture/SRS.md). `migrate.js` chạy đúng trên Postgres.
>
> ⚠️ Còn sót, **không chạy qua `migrate.js`** nên không ai thấy lỗi:
> - `db/migrations/001`, `002`, `004`, `005`, `006` là **bản MySQL cũ**, đã bị `010_seed_auth_postgres.sql` thay.
>   Chúng chỉ còn giá trị tham chiếu trong tài liệu; **đừng chạy**.
> - ~~`010_add_pages_and_items.sql` trùng số 010~~ – **đã xoá**: nó chỉ `INSERT` dữ liệu mẫu cho
>   `pages` / `items` / `page_items`, không nằm trong `migrate.js`, và **không dòng code nào trong
>   `backend/src` đọc ba bảng đó**. Ba bảng vẫn còn trong `db/schema/` (nên tổng vẫn là 17 bảng);
>   bỏ hẳn chúng khỏi schema là quyết định của nhóm DB, chưa làm.
> - `db/verify.sql` và `db/seed/seed.sql` vẫn viết `Test_Cases` / `Test_Steps` chữ hoa. Postgres tự hạ chữ thường
>   với identifier không đặt trong dấu `"`, nên vẫn chạy – nhưng gây nhầm, nên sửa về chữ thường.

Thư mục này **giải thích**; còn SQL thật nằm ở `db/` ngoài repo root (`db/schema/`, `db/migrations/`, `db/seed/`, `db/verify.sql`), quy ước đặt tên field nằm ở `db/README.md`.

## File trong thư mục

| File | Là gì | Dùng khi |
| --- | --- | --- |
| [`phan-biet-cac-loai-database.md`](./phan-biet-cac-loai-database.md) | Phân biệt **Application DB** (của AutoGrader) / **Backend của AutoGrader** / **Test Automation DB** (của nhóm); Playwright đứng ở đâu; thứ tự nên làm | **Đọc đầu tiên** nếu còn mơ hồ "làm DB nào trước" |
| [`phan-cong-db-va-du-lieu.md`](./phan-cong-db-va-du-lieu.md) | Phân công hướng b: 11 việc DB (**D0–D10**) và 8 việc dữ liệu test (**X0–X7**), kèm cột tiến độ thực tế | Hằng ngày – để biết mình đang làm việc nào, phụ thuộc ai |
| `Giai_thich_DB_Backend_Test_Automation.pdf` | File gốc của tài liệu đầu | Chỉ để đối chiếu |
| `Phan_cong_DB_va_Du_lieu_huong_b.docx` | File gốc của tài liệu thứ hai | Chỉ để đối chiếu |

## Ba thứ dễ nhầm

| | Application DB | Test Automation DB | `backend/` của repo này |
| --- | --- | --- | --- |
| Thuộc về | Website OOP AutoGrader | Nhóm testing | Dashboard quản lý test của nhóm |
| Có trong repo? | ✘ Không | ✔ `db/` | ✔ `backend/` |
| Vai trò | Đối tượng *bị* test | Lưu test case / data / result | Phục vụ giao diện dashboard |

## "Hướng b" là gì

Spec Playwright **không hard-code dữ liệu**, mà gọi `loadTestCase(tcCode)` để đọc `Test_Steps` / `Test_Data` / `Test_Cases` từ Test Automation DB, rồi ghi kết quả về `Test_Results`.
Hiện mới chỉ `TC-AUTH-005` chạy theo kiểu này; mục tiêu là mở rộng cho TC-01 → TC-31.

## Quy tắc bảo trì

- 🔒 **Không bao giờ** đưa mật khẩu thật, token hay thông tin cá nhân vào DB, migration hay git. Trong `Test_Data` chỉ lưu tham chiếu `env:TÊN_BIẾN`; giá trị thật nằm trong `.env`.
- **Chạy thật trước, ghi DB sau.** Không viết steps/data cho TC chưa chạy thử trên hệ thống thật; phải ghi đúng *exact message*.
- **Không sửa migration cũ.** Website đổi thì thêm migration mới (cao nhất hiện tại là `006`, nên file tiếp theo là `007_…`).
- **Tên bảng/cột luôn theo `db/schema/`** (`snake_case` chữ thường). Nếu cần đổi thì sửa schema trước, rồi mới viết migration.
- Migration đánh số tăng dần, không bỏ số – hiện **thiếu `003_submission_steps_data.sql`** (mục D6).
- Cập nhật cột *Tiến độ* trong `phan-cong-db-va-du-lieu.md` mỗi khi xong một mục D/X.
