# Explain – `docs/database/`

**Nội dung:** mọi thứ liên quan tới dữ liệu kiểm thử – giải thích khái niệm và phân công công việc cụ thể.

> 📌 **Nguồn chuẩn về cấu trúc DB là `db/schema/test_automation_db_schema.sql`** (tên bảng, tên cột, kiểu, ENUM).
> Seed và migration phải theo schema, không ngược lại. Hiện `db/seed/seed.sql` và `db/migrations/001`, `002` đang dùng
> tên bảng chữ hoa (`Test_Suites`) và cột `description` thay vì `suite_description` → **sai, cần sửa**.
> Nguồn chuẩn về kiến trúc và công nghệ là [`../architecture/SRS.md`](../architecture/SRS.md) – SRS ghi **Supabase (PostgreSQL)**
> trong khi schema hiện là MySQL; đây là khoảng cách nhóm phải xử lý, xem [`../GIT_WORKFLOW.md`](../GIT_WORKFLOW.md) mục 9.

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
- **Không sửa migration cũ.** Website đổi thì thêm migration mới (`005_…`).
- **Tên bảng/cột luôn theo `db/schema/`** (`snake_case` chữ thường). Nếu cần đổi thì sửa schema trước, rồi mới viết migration.
- Migration đánh số tăng dần, không bỏ số – hiện **thiếu `003_submission_steps_data.sql`** (mục D6).
- Cập nhật cột *Tiến độ* trong `phan-cong-db-va-du-lieu.md` mỗi khi xong một mục D/X.
