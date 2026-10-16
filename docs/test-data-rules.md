# Quy tắc dữ liệu test (X1)

Áp dụng cho cả nhóm. Môi trường test: **https://oop-autograder-test.vercel.app/** (do giảng viên cấp; `BASE_URL` trong `.env`).
Mọi thứ bộ test tạo ở đây là dữ liệu thật của môi trường này, nên phải nhận biết và dọn được.
Quy tắc khớp với CSV trong `automation/fixtures/` (IRN đầu `2099`, email `autotest.`).

## 0. Chạy nhanh

```
cd automation
npm install
npm run data:apply      # ghi dữ liệu TC-08 theo quy tắc vào DB (tự nhận schema; thêm -- --dry-run để chỉ xem)
npm run check:x1x3      # kiểm tra X1, X2, X3 (đặt biến DB_* để kiểm cả DB)
```

`check:x1x3` báo `[OK]` / `[LOI]` / `[CHO]`. `[CHO]` là việc phải làm tay (biên bản thủ công X3).

## 1. Quy tắc đặt tên

| Dữ liệu | Quy tắc | Ví dụ |
|---|---|---|
| IRN user test | `2099` + `runId` (10 chữ số, đầu `2099` là giả) | `2099482913` |
| Họ tên | `AUTOTEST <Tên> <runId>` | `AUTOTEST Tran Thi B 482913` |
| Email | `autotest.<runId>@eiu.edu.vn` | `autotest.482913@eiu.edu.vn` |
| Tên Lab (Projects → + New Lab) | `AUTOTEST_Lab_<runId>` | `AUTOTEST_Lab_482913` |
| Mật khẩu | lấy từ `.env`, tối thiểu 8 ký tự | `TEST_NEW_USER_PASSWORD` |

`runId` = 6 số cuối của `Date.now()`, sinh một lần mỗi lần chạy (`automation/tests/utils/test-data.js`).

Tài khoản giảng viên cấp có IRN dạng chữ (`lecturer.tester`, `student.tester`), nên IRN **có thể không bắt buộc là số**.
Khi chạy TC-08 lần đầu, thử thêm IRN dạng `AUTOTEST_<runId>`; nếu web nhận thì đổi `irn_prefix` cho dễ nhận biết. Hiện giữ `2099` cho khớp CSV.

Dữ liệu TC-08 trong DB (`irn_prefix=2024`, `full_name_prefix=Tran Thi B`, `email_prefix=tranthib`) chưa theo quy tắc;
chạy `npm run data:apply` (hoặc `db/migrations/005_autotest_data_rules.sql`) để đổi. Spec TC-08 đọc 3 giá trị này từ DB nên **không cần sửa code**.

## 2. Tài khoản test (X2)

- Giảng viên cấp 2 tài khoản cho môi trường test: **lecturer** (`lecturer.tester`) và **student** (`student.tester`).
  Tên đăng nhập và mật khẩu chỉ ghi trong `.env` (`TEST_LECTURER_IRN/PASSWORD`, `TEST_STUDENT_IRN/PASSWORD`).
  **Không ghi vào repo** (repo public) và không commit file `X0.docx`.
- Mật khẩu hiện tại chỉ 6 ký tự, ngắn hơn mức tối thiểu 8 ký tự của chức năng đổi mật khẩu. Không chạy test đổi mật khẩu lên chính hai tài khoản này; TC-11 chỉ đổi mật khẩu user do TC-08 tạo (`TEST_TEMP_PASSWORD` >= 8 ký tự).
- **Kiểm tra student đã ghi danh term hiện tại**: đăng nhập `student.tester`. Vào `/student-dashboard` là đạt. Vào `/student-history` nghĩa là chưa ghi danh,
  nhờ lecturer thêm vào term hiện tại (Terms → chọn term → Available Students), nếu không các TC nộp bài sẽ lỗi.
- TC-28 cần student thứ hai (`TEST_STUDENT2_*`). Chưa có thì xin giảng viên hoặc tạo một user theo mục 1 và ghi danh.

## 3. Việc không nên làm

- Không bấm **Set as Current Term**. Cả nhóm dùng chung môi trường và mọi TC dựa vào term hiện tại.
- Không bật **Student Visible** cho Lab test nếu không cần.
- Không dùng IRN, email, tài khoản của người thật làm dữ liệu tạo mới.

## 4. CSV (TC-09)

Dùng các file có sẵn trong `automation/fixtures/` (`student_list_batch1.csv`, `_duplicate`, `_invalid_rows`, `_empty`, `_wrong_format.txt`).
Theo hướng dẫn sử dụng, Import trong Terms **chỉ ghi danh sinh viên đã có sẵn**, không tạo tài khoản (khớp ghi chú BLOCKED của TC-09).
Trước khi import phải tạo user `2099000001`...`2099000005` (Users → Add User hoặc qua TC-08). File nhận `.xlsx`, `.xls`, `.csv`.

## 5. Dọn dữ liệu test

Giảng viên **chưa trả lời** cách dọn dữ liệu test. Trong lúc chờ, theo hướng dẫn sử dụng: **Delete (thùng rác) là xóa vĩnh viễn**
(lịch sử nộp bài vẫn còn), còn **Suspend** chỉ khóa đăng nhập (chỉ cho STUDENT). TC-12 chỉ Suspend nên user vẫn còn.

1. Lecturer → **Users**, tìm `AUTOTEST` và `autotest.`, xóa từng user.
2. **Terms** → term hiện tại, gỡ các student `2099...` khỏi Enrolled Students (✕).
3. **Projects**, xóa Lab `AUTOTEST_Lab_...` nếu có.
4. Làm vào cuối tuần và trước ngày nộp. Bảng trong DB `test_automation_db` chỉ lưu kết quả test, không cần dọn.

## 6. Lab 1 và bài nộp mẫu

- Lab 1 đã có trên môi trường test, nhưng giảng viên nói các loại bài tập/lab **không theo thứ tự cố định**: tên "Lab 1" không đảm bảo là bài trong fixtures mẫu (`Student`, `Shape/Circle`).
- Thầy đã gửi thư mục bài nộp tham chiếu (`Submission.zip`): `0000000000_Perfect_Solution_<tên lab>` cho `Lab_2`, `Lab_3`, `Lab_6`, `Lab_7`, `253F`, `Cake_Shop`, `Flower_Shop`.
  Việc cần làm: đăng nhập lecturer, mở **Projects**, xem Lab 1 thật sự là bài nào rồi ghép với thư mục tương ứng để thay `valid_full`. Zip không có thư mục tên Lab 1.
- `0000000000` là IRN giả. Nếu web đối chiếu IRN trong tên thư mục với tài khoản đăng nhập thì đổi tên thư mục gốc theo `TEST_STUDENT_IRN` (cách làm của `fixture-builder.js`).
- Mỗi lần nộp thành một attempt trong History của tài khoản student, sinh viên không tự xóa được, nên chỉ nộp bằng `student.tester`.

## 7. Điểm cần thống nhất trong repo

- **Tên bảng/cột:** `db/schema/test_automation_db_schema.sql`, migration 004 và `testData.ts` dùng `test_data.data_value`; migration 002 và `test-case-loader.js` dùng `Test_Data.value`. Cần chốt theo DB thật rồi sửa phía còn lại.
- **Migration 004** (TC-23 → TC-30) đang dùng tài khoản mẫu `student01@example.com`, `student02@example.com`, `lecturer01@example.com`.
  Nên đổi thành `env:TEST_STUDENT_IRN`, `env:TEST_STUDENT2_IRN`, `env:TEST_LECTURER_IRN` như các TC khác.
