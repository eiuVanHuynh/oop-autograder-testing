# Explain – `docs/testing/`

**Nội dung:** tài liệu kiểm thử cho **SUT – website OOP AutoGrader** (`https://oop-autograder.vercel.app`).

> Đây là *cái được test*, không phải repo này. Đặc tả của repo này nằm ở [`../architecture/SRS.md`](../architecture/SRS.md).

## File trong thư mục

| File | Là gì | Dùng khi |
| --- | --- | --- |
| [`test-plan.md`](./test-plan.md) | Chiến lược, phạm vi (3 module), môi trường, công cụ, tiêu chí Pass/Fail | Khi cần biết "nhóm test cái gì và tiêu chí nào là đạt" |
| [`test-case-matrix.md`](./test-case-matrix.md) | **Nguồn chuẩn** của bộ test case: `TC-01` → `TC-31`, kèm bảng trạng thái tự động hóa | Khi viết spec Playwright hoặc viết migration steps/data |
| [`fr-mapping.md`](./fr-mapping.md) | Traceability matrix: FR-1 … FR-16 ↔ test case, kèm bảng khoảng trống độ phủ | Khi kiểm tra độ phủ yêu cầu, hoặc trước khi nộp báo cáo |
| [`sut-reference.md`](./sut-reference.md) | Route, API, selector đã kiểm chứng và thông báo lỗi thật của SUT, đọc từ source tại commit `01f6b47` | Khi viết selector cho spec hoặc viết `step_target` trong migration |
| [`lecturer-test-data.md`](./lecturer-test-data.md) | **X6–X7**: bộ dữ liệu giảng viên cho TC-23 → TC-30 – lab, cấu trúc lớp, quan hệ MMD, operational testcase, mã Java tham chiếu, quy tắc export và thư mục download | Khi dựng dữ liệu test trên SUT hoặc viết spec giảng viên |

## Bộ mã test case

**`TC-01` → `TC-31` (31 test case).** Phân nhóm:

| Nhóm | Mã | Thư mục spec |
| --- | --- | --- |
| Xác thực & Quản lý Người dùng | TC-01 → TC-12, TC-31 | `automation/tests/auth/` |
| Nộp bài & Chấm điểm (Sinh viên) | TC-13 → TC-22 | `automation/tests/submission/`, `student/` |
| Quản lý của Giảng viên | TC-23 → TC-30 | `automation/tests/lecturer/` *(chưa có spec)* |

> ⚠️ Các bản tài liệu cũ ghi "TC-01 → TC-44" là **sai**. Đồng thời `db/seed/seed.sql` còn dùng bộ mã song song `TC-AUTH-xxx` / `TC-UI-xxx` – nhóm cần chốt một bộ (xem [`../GIT_WORKFLOW.md`](../GIT_WORKFLOW.md) mục 9).

## ⚠️ Hai việc chặn, cần chốt trước khi viết spec giảng viên

1. **`db/migrations/004_lecturer_steps_data.sql` gán TC-23 → TC-27 cho các kịch bản của *sinh viên*** (xem kết quả MMD, testcase, history),
   trong khi ma trận định nghĩa TC-23 → TC-27 là của *giảng viên* (tạo lab, cấu trúc lớp, MMD, testcase, dry-run).
   Chi tiết ở [`../database/phan-cong-db-va-du-lieu.md`](../database/phan-cong-db-va-du-lieu.md) mục D8.
2. **SUT không có `data-testid` nào** → quy ước `testid=` trong `db/README.md` không dùng được.
   Xem [`sut-reference.md`](./sut-reference.md) mục 4.

## Quy tắc bảo trì

- **Selector phải tra ở [`sut-reference.md`](./sut-reference.md) hoặc source SUT**, không tự nghĩ ra. Chỉ `text=` và `placeholder=` dùng được.
- **Thêm / sửa test case thì sửa `test-case-matrix.md` trước**, rồi mới cập nhật `fr-mapping.md` và viết spec.
- Mã TC chỉ **thêm mới ở cuối** (TC-32, TC-33…), **không đánh số lại** – vì mã đã nằm trong `db/`, trong tiêu đề spec và trong `test_results`.
- Mỗi lần thêm TC phải ánh xạ vào ít nhất một FR trong `fr-mapping.md`, nếu không thì ghi rõ lý do.
- `Source Reference` trong ma trận trỏ tới mục của **tài liệu đặc tả SUT** (tài liệu bên ngoài repo), không phải `SRS.md`.
- Hai tài liệu dự kiến bổ sung (mục X1, X3 trong [`../database/phan-cong-db-va-du-lieu.md`](../database/phan-cong-db-va-du-lieu.md)) sẽ nằm ở đây: `test-data-rules.md` và thư mục `manual-tests/`.
