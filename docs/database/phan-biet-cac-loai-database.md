# Phân biệt Application DB, Backend của website và Test Automation DB

> **Nguồn:** `Giai_thich_DB_Backend_Test_Automation.pdf` (tài liệu thành viên chia sẻ), đã chuyển sang Markdown và bổ sung đối chiếu với code hiện có trong repo.
>
> **Mục đích:** trả lời câu hỏi hay bị nhầm trong nhóm – *database nào cần chuẩn bị trước, backend nào phải chạy trước, Playwright nằm ở đâu trong quy trình.*

## 1. Có 2 loại Database khác nhau

| Thành phần | Mục đích | Ai sử dụng | Có phải DB của website không? | Nằm ở đâu trong repo |
| --- | --- | --- | :-: | --- |
| **Application DB** | Lưu tài khoản, lab, submission, điểm, kết quả chấm… | Backend của OOP AutoGrader | ✔ Có | **Không có trong repo này** – thuộc hệ thống cần test |
| **Test Automation DB** | Lưu test case, test data, test run, test result… | Playwright / test automation | ✘ Không | `db/schema/test_automation_db_schema.sql` |

Hai thứ này **không thay thế cho nhau**. Nhầm lẫn giữa chúng là nguyên nhân phổ biến khiến nhóm hiểu sai thứ tự công việc.

## 2. Application DB là gì?

Database thuộc về chính hệ thống OOP AutoGrader. Backend của website kết nối tới nó để xử lý nghiệp vụ.

Ví dụ luồng đăng nhập:

1. Student nhập IRN + password trên website.
2. Frontend gửi `POST /api/auth/login`.
3. Backend nhận request.
4. Backend kiểm tra tài khoản trong **Application DB**.
5. Backend trả response.
6. Frontend redirect hoặc hiển thị lỗi.

> Nếu Application DB hoặc backend của AutoGrader không hoạt động, Playwright **không thể** kiểm thử đúng luồng end-to-end.

## 3. Test Automation DB là gì?

Database do nhóm testing tạo ra để quản lý dữ liệu phục vụ kiểm thử. Nó **không làm website chạy**.

Các bảng hiện có trong `db/schema/test_automation_db_schema.sql`:

`users` · `test_suites` · `test_specs` · `test_cases` · `test_steps` · `test_data` · `test_runs` · `test_results` · `test_evidences` · `reports`
*(`bug_feedbacks` đang bị comment, chưa bật.)*

Ví dụ: `test_cases` lưu `TC-AUTH-005`, còn `test_results` lưu PASS/FAIL, actual result, error message và thời gian chạy.

## 4. Backend của website ≠ Test Automation DB

Backend của AutoGrader là code xử lý nghiệp vụ của **website cần test**: nhận request từ frontend, xử lý logic, truy cập Application DB, trả response.

Test Automation DB chỉ hỗ trợ nhóm test quản lý test case / dữ liệu / kết quả.

> ⚠️ Repo này **cũng có** một thư mục `backend/`. Đó là backend của **dashboard quản lý test** (xem [`../backend/backend-design.md`](../backend/backend-design.md)), **không phải** backend của AutoGrader. Ba thứ khác nhau hoàn toàn:
> `backend/` của repo này · backend của AutoGrader (SUT) · Test Automation DB.

## 5. Playwright đứng ở đâu?

Playwright thao tác với website giống người dùng thật và kiểm tra kết quả thực tế:

1. Playwright đọc test data từ Test Automation DB hoặc fixture.
2. Playwright mở website.
3. Playwright nhập dữ liệu và click.
4. Website gọi Backend của AutoGrader.
5. Backend xử lý và truy cập Application DB.
6. Website hiển thị kết quả.
7. Playwright assert kết quả.
8. Playwright ghi PASS/FAIL vào Test Automation DB.

## 6. Sơ đồ tổng thể

```
TEST AUTOMATION DB
 test_cases / test_data / test_results
       │
       ▼
    PLAYWRIGHT
       │
       ▼
   OOP AUTOGRADER WEB
    Frontend → Backend
           │
           ▼
      APPLICATION DB
           │
           ▼
      Response / UI
           │
           ▼
       ASSERTION
```

## 7. Nên làm theo thứ tự nào?

1. **Xác định hệ thống cần test:** biết URL, các chức năng, API và trạng thái hiện tại của AutoGrader.
2. **Chuẩn bị Test Automation DB tối thiểu:** schema + connection + một số test case / test data cần thiết.
3. **Chuẩn bị fixture:** ví dụ `valid_full`, `invalid_subfolder_name`, `missing_challenge`, `compile_error`.
4. **Viết Playwright test:** test đọc dữ liệu từ DB/fixture và thao tác trên website.
5. **Chạy trên hệ thống thật:** backend + Application DB của AutoGrader phải hoạt động đủ để test.
6. **Kiểm tra actual result:** không tự đoán expected behavior; ghi lại kết quả hệ thống thực tế.
7. **Ghi test result:** lưu PASS/FAIL và actual result vào Test Automation DB.

## 8. Điều KHÔNG nên làm

- Không chờ Test Automation DB hoàn thiện 100% rồi mới viết Playwright test đầu tiên.
- Không dùng Test Automation DB để thay thế Application DB của AutoGrader.
- Không tự viết backend mới chỉ vì muốn chạy test, nếu mục tiêu là kiểm thử backend hiện có của AutoGrader.
- Không lấy Lab 2 làm reference cho Lab 1 khi chưa xác nhận yêu cầu.
- Không tự đoán expected result; phải test hệ thống thật và ghi **exact message**.

## 9. Áp dụng trực tiếp vào project hiện tại

Repo `oop-autograder-testing` đang xây dựng phần Test Automation. Các fixture như `valid_full` và `fixture-builder` thuộc **Test Data / Automation**, không phải backend của AutoGrader.

Hướng đi phù hợp: chuẩn bị Test Automation DB ở mức đủ dùng → hoàn thiện fixture / test data → viết Playwright → chạy trên website AutoGrader thật → kiểm tra backend/API và UI → lưu kết quả test.

## 10. Tóm tắt

| Cái gì? | Nhiệm vụ | Thời điểm |
| --- | --- | --- |
| **Application DB** | Làm cho website có dữ liệu để backend xử lý | Thuộc hệ thống cần test; phải hoạt động khi chạy E2E |
| **Backend (của AutoGrader)** | Xử lý request, nghiệp vụ, kết nối Application DB | Phải chạy khi kiểm thử API/E2E |
| **Test Automation DB** | Quản lý test case / data / run / result | Chuẩn bị trước hoặc song song với Playwright |
| **Fixture** | Dữ liệu / file submission dùng cho test | Chuẩn bị trước test scenario tương ứng |
| **Playwright** | Thao tác website và kiểm tra kết quả | Sau khi test data và hệ thống cần test đã sẵn sàng |

**Kết luận:** không phải *"làm database xong → viết backend → web mới chạy"*. Backend + Application DB của AutoGrader là **đối tượng cần kiểm thử** và phải hoạt động. Test Automation DB là cơ sở dữ liệu **hỗ trợ** nhóm test. Playwright dùng cả test data/fixture lẫn website thật để kiểm tra kết quả.

---

**Xem tiếp:** [`phan-cong-db-va-du-lieu.md`](./phan-cong-db-va-du-lieu.md) – phân công cụ thể từng việc D0–D10 và X0–X7.
