# Quy ước đặt tên dữ liệu test trong DB

**Tài liệu viết bằng tiếng Việt; giá trị ghi vào DB viết bằng tiếng Anh.**
Nguồn chuẩn về tên bảng / tên cột là [`schema/test_automation_db_schema.sql`](./schema/test_automation_db_schema.sql)
(PostgreSQL, tên bảng **viết thường**: `test_steps`, `test_data`, …).

## 1. `test_data.field_name`

- viết thường
- nhiều từ nối bằng `_`
- không dấu

Ví dụ: `user_name`, `password`, `full_name`, `email`, `student_id`, `course_name`

Giá trị tương ứng nằm ở cột `data_value`; cột `is_valid` đánh dấu đây là dữ liệu hợp lệ hay dữ liệu sai dùng để test nhánh lỗi.

## 2. `test_steps.step_action`

Viết **IN HOA** hết. Bộ chạy test chỉ hiểu đúng 4 action này
(`backend/src/services/runner/steps.js` — đổi ở đây thì phải chạy lại `cd frontend && npm run check`):

```
NAVIGATE
FILL
CLICK
VERIFY
```

> `UPLOAD` có trong tài liệu cũ nhưng **bộ chạy test chưa cài**. Dùng nó thì cả test case **FAIL**
> (`unsupported action: UPLOAD`) – runner cố tình không bỏ qua step lạ, vì bỏ qua sẽ báo `passed` cho
> một việc chưa làm.

## 3. `test_steps.step_target`

Dạng duy nhất: `type=value`.

- `type` viết thường và **chỉ có 4 giá trị** runner hiểu: `placeholder`, `text`, `role`, `css`
  (`toLocator()` trong `backend/src/services/runner/steps.js`)
- `value` giữ nguyên nội dung thật của element / placeholder / role / selector

Hợp lệ:

```
placeholder=Username
text=Login
role=button
css=#login-form input[name="irn"]
```

Không dùng `type: value`, `type-value`, hay chỉ ghi `value`.

> ❌ **`testid=` KHÔNG tồn tại.** Tài liệu cũ dạy viết `testid=login-button`; runner không có tiền tố đó
> nên nó rơi vào nhánh "không tiền tố" và bị dùng nguyên chuỗi làm **CSS selector** → không khớp gì, step FAIL.
> Có dòng nào đang ghi `testid=` thì phải sửa.
>
> ⚠️ Và **SUT không có `data-testid` nào** để trỏ tới cả → trên thực tế chỉ dùng `text=` và `placeholder=`.
> Xem [`../docs/testing/sut-reference.md`](../docs/testing/sut-reference.md) mục 4.

## 4. Step `FILL` lấy dữ liệu ở đâu

Dùng cột **`test_steps.field_name`** để trỏ sang `test_data.field_name` (thêm ở
[`migrations/011_test_steps_field_name.sql`](./migrations/011_test_steps_field_name.sql)).

```
step_action = FILL
step_target = placeholder=Username
field_name  = user_name
```

> Dòng **cũ** (trước migration 011) nhúng tên field vào `expected_result` dạng `(field user_name)`.
> Bộ chạy test và frontend vẫn đọc được dạng đó như nhánh dự phòng, nhưng **đừng viết mới theo cách này**.

## 5. Tham chiếu dữ liệu bí mật

Chỉ lưu **tên biến môi trường**, không bao giờ lưu giá trị thật.

- Tên biến: CHỮ IN HOA, nối bằng `_` — `TEST_PASSWORD`, `API_KEY`, `GOOGLE_CLIENT_SECRET`
- Tham chiếu: `env:TÊN_BIẾN` — tiền tố `env:` viết thường

```
field_name = password
data_value = env:TEST_PASSWORD
```

Khai báo biến ở [`../.env.example`](../.env.example); luật đặt tên dữ liệu test ở
[`../docs/test-data-rules.md`](../docs/test-data-rules.md).
