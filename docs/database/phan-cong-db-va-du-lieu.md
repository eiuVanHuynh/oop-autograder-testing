# Phân công công việc: Database và Dữ liệu test (hướng b)

> **Nguồn:** `Phan_cong_DB_va_Du_lieu_huong_b.docx` (tài liệu thành viên chia sẻ), đã chuyển sang Markdown và bổ sung cột tiến độ thực tế (cập nhật 17/10/2026).
>
> **Thành viên:** A = ______________ · B = ______________ · C = ______________

## 1. "Hướng b" nghĩa là gì

Mỗi spec **không còn viết cứng dữ liệu trong code**. Spec gọi một hàm dùng chung để lấy từ DB:

- các bước → `Test_Steps`
- dữ liệu vào → `Test_Data`
- kết quả mong đợi → `Test_Cases` / `Test_Steps`

rồi chạy trên website thật và ghi kết quả về `Test_Results`.

Hiện chỉ `TC-AUTH-005` làm như vậy; phải mở rộng cho **TC-01 … TC-31**.

**Phân công theo mảng:**

| Người | Mảng | Test case |
| :-: | --- | --- |
| **A** | Xác thực và user | TC-01 … TC-12, TC-31 |
| **B** | Nộp bài | TC-13 … TC-22 |
| **C** | Giảng viên và hạ tầng | TC-23 … TC-30 |

> 🔒 **Bảo mật:** không đưa mật khẩu tài khoản thật vào DB hay file migration (sẽ bị commit lên git).
> Trong `Test_Data` chỉ lưu **tham chiếu**, ví dụ `env:TEST_STUDENT_PASSWORD`; mật khẩu thật nằm trong `.env` (đã có trong `.gitignore`).

---

## 2. PHẦN I – Công việc về Database

### 2.1. Việc nền (làm trước, cả nhóm phụ thuộc)

| # | Việc | Người | Xong khi | Tiến độ |
| :-: | --- | :-: | --- | --- |
| **D0** | Chốt quy ước lưu dữ liệu trong DB và viết vào `db/README.md`: tên `field_name` chuẩn trong `Test_Data` (`username`, `password`, `expected_message`, `file_path`…); `action` trong `Test_Steps` (`NAVIGATE`, `FILL`, `CLICK`, `VERIFY`, `UPLOAD`…); định dạng `target` (`text=…`, `placeholder=…`, `testid=…`); cách tham chiếu bí mật (`env:TÊN_BIẾN`). A và B góp ý trước khi chốt. | C | A và B đồng ý, README có ví dụ | ✅ `db/README.md` đã có |
| **D1** | Viết helper dùng chung `loadTestCase(tcCode)`: đọc `Test_Cases`, `Test_Steps`, `Test_Data` của một mã TC, trả về object; có `getData(field)` và `getStep(n)`. Báo lỗi rõ ràng nếu thiếu steps hoặc data. Tổng quát hóa phần đọc dữ liệu hiện nằm trong `auth-db.spec.js`. | C | `auth-db.spec.js` chạy lại bằng helper mới và vẫn pass | 🔄 `automation/tests/utils/test-case-loader.js` |
| **D2** | Kiểm tra logger và schema: `Test_Results` có ghi actual result, error message, thời gian chạy không; test skip/manual ghi thế nào (schema có trạng thái `skipped` không); screenshot khi fail có ghi vào `Test_Evidences` không. Thêm `DB_POOL_SIZE` vào `.env.example`. | C | Báo cáo ngắn cho nhóm và sửa nếu thiếu | ⬜ |
| **D3** | Viết `db/verify.sql` (mỗi TC đã chạy có ít nhất 1 step và data cần thiết; không có `tc_code` trùng; đếm bảng) và script chạy lần lượt `seed.sql` rồi các migration theo thứ tự. | C | Chạy một lệnh là dựng lại toàn bộ DB test | 🔄 `db/verify.sql` đã có, thiếu script dựng lại |

### 2.2. Việc theo mảng (làm song song sau D0 và D1)

| # | Việc | Người | Xong khi | Tiến độ |
| :-: | --- | :-: | --- | --- |
| **D4** | Migration `002_auth_steps_data.sql`: steps và data cho TC-01…TC-12 và TC-31, ghi theo kết quả đã chạy thật (exact message, redirect thật). Dùng bảng tạm có `COLLATE utf8mb4_unicode_ci`. Mật khẩu thật dùng tham chiếu `env:`. | A | Chạy không lỗi, `verify.sql` đạt cho các TC này | ✅ |
| **D5** | Sửa `auth.spec.js` (TC-01…TC-12, TC-31) đọc dữ liệu qua `loadTestCase` thay vì viết cứng. Đổi tiêu đề `auth-db.spec.js` về `TC-AUTH-005`. | A | Các test cũ vẫn pass, `Test_Results` ghi đúng mã | 🔄 |
| **D6** | Migration `003_submission_steps_data.sql`: steps và data cho TC-13…TC-22. `Test_Data` lưu **tên kịch bản fixture** (`valid_full`, `compile_error`…) và điểm mong đợi, **không** lưu nội dung file. | B | Chạy không lỗi, `verify.sql` đạt | ⬜ **chưa có file** |
| **D7** | Sửa `submission.spec.js` (TC-13…TC-22) đọc dữ liệu qua `loadTestCase`; đường dẫn fixture lấy từ tên kịch bản trong `Test_Data`. | B | TC-13, 14, 15 pass; các lô sau theo quy trình lô nhỏ | ⬜ |
| **D8** | Migration `004_lecturer_steps_data.sql`: steps và data cho TC-23…TC-30. Spec giảng viên mới viết đọc dữ liệu qua helper ngay từ đầu. | C | Chạy không lỗi, `verify.sql` đạt | 🛑 **migration đã có nhưng gán sai mã TC** – xem bên dưới; spec chưa có |
| **D9** | Ghi lỗi tìm được vào `Bug_Feedbacks`: mỗi người ghi lỗi thuộc mảng của mình, gắn với execution tương ứng. ⚠️ **Ví dụ bug cũ đã bị bác bỏ** – xem ghi chú dưới bảng. | A, B, C | Mỗi lỗi có bản ghi, mô tả và mức độ | ⬜ bảng `bug_feedbacks` **đang bị comment** trong schema |
| **D10** | Tổng hợp cuối: xuất báo cáo PDF từ DB (`export-report.js`), kiểm tra `Test_Results` đủ cho mọi TC đã chạy và ghi chú TC thủ công. | C | Báo cáo hoàn chỉnh | ⬜ |

> 🛑 **D8 – `004_lecturer_steps_data.sql` đang dùng bộ mã TC khác với ma trận.** Phải xử lý trước khi viết spec giảng viên.
>
> | Mã | `004` gán cho | [`../testing/test-case-matrix.md`](../testing/test-case-matrix.md) định nghĩa |
> | --- | --- | --- |
> | TC-23 | Tab MMD Diagram – pass/fail class/relationship *(sinh viên)* | Tạo và xóa cấu trúc Lab trong rubric *(giảng viên)* |
> | TC-24 | Phát hiện thiếu class / relationship sai *(sinh viên)* | Định nghĩa cấu trúc lớp và thành phần *(giảng viên)* |
> | TC-25 | Testcase example hiển thị đầy đủ I/O *(sinh viên)* | Định nghĩa quan hệ MMD *(giảng viên)* |
> | TC-26 | Testcase hidden chỉ hiện pass/fail *(sinh viên)* | Cấu hình testcase vận hành *(giảng viên)* |
> | TC-27 | Submission History *(sinh viên)* | Dry-run testcase *(giảng viên)* |
> | TC-28 | Lecturer Grading Dashboard | Lecturer Dashboard ✅ khớp |
> | TC-29 | Cross-Lab Grade Matrix | Grade Matrix ✅ khớp |
> | TC-30 | Grade Matrix – export | Export dữ liệu ✅ khớp |
>
> Chính header của `004` đã cảnh báo: *"tc_code duoc gia dinh la 'TC-23'...'TC-30' (neu migration 002/003 dat ma khac, sua lai...)"*.
> Nếu chạy nguyên trạng, steps của sinh viên sẽ gắn vào test case giảng viên. **Nhóm phải chốt trước:** hoặc sửa `004` cho khớp ma trận,
> hoặc mở rộng ma trận thêm các TC xem kết quả của sinh viên rồi đánh lại số.
>
> ⚠️ **Thêm:** `step_target` trong `004` là mô tả tự do tiếng Việt (`'Login form'`, `'Tab MMD Diagram'`), **không theo định dạng
> `type=value`** mà `db/README.md` mục 3 quy định – trong khi `002` thì làm đúng (`text=Sign In`, `placeholder=Enter your password`).
> Helper `loadTestCase` sẽ không parse được. Cần viết lại `step_target` của `004`.

> ⚠️ **D9 – ví dụ bug cũ không còn đúng.** Bản gốc nêu "API trả `Invalid IRN or password` còn giao diện hiện `IRN or password is wrong`"
> làm ví dụ bug. Đọc source SUT tại commit `01f6b47` cho thấy đây là **thiết kế cố ý**: frontend chỉ hiển thị message của backend cho các
> context trong `BACKEND_MESSAGE_CONTEXTS`, và `login` không nằm trong đó – nó map theo HTTP status.
> Chi tiết: [`../testing/sut-reference.md`](../testing/sut-reference.md) mục 6. **Cần tìm ví dụ bug khác.**

> **Quy trình mỗi lô 3–4 test case:** chạy thật trước → ghi exact message → rồi mới viết migration steps/data cho lô đó.
> **Không viết steps/data cho TC chưa chạy thử.**

---

## 3. PHẦN II – Công việc về Dữ liệu test

Đây là dữ liệu nằm **ngoài** Test Automation DB (tài khoản, file, cấu hình trên website). Nhóm chỉ thao tác **qua giao diện web**, không sửa trực tiếp Application DB của AutoGrader.

### 3.1. Việc chung

| # | Việc | Người | Xong khi | Tiến độ |
| :-: | --- | :-: | --- | --- |
| **X0** | Hỏi giảng viên / người phụ trách AutoGrader: tài khoản student và lecturer test; Lab 1 có sẵn chưa; lời giải tham chiếu Lab 1; cách dọn dữ liệu test; có môi trường test cho Google OAuth và email reset không. | B | Có trả lời bằng văn bản và chia lại cho A, C | ⬜ |
| **X1** | Quy tắc dữ liệu test: mọi dữ liệu nhóm tạo trên website có tiền tố `AUTOTEST_` (tên Lab, lớp, user) để dễ nhận biết và dọn; ghi vào `docs/testing/test-data-rules.md`. Cập nhật `.env.example` với các biến `TEST_*` (không đưa giá trị thật). | A | Cả nhóm dùng cùng quy tắc | ⬜ **chưa có `test-data-rules.md`** |

### 3.2. Việc theo mảng

| # | Việc | Người | Xong khi | Tiến độ |
| :-: | --- | :-: | --- | --- |
| **X2** | Tài khoản và dữ liệu user: tài khoản student/lecturer test trong `.env`; hàm sinh IRN duy nhất mỗi lần chạy cho TC-08, TC-09, TC-12; file CSV mẫu cho TC-09 (dòng hợp lệ, dòng IRN trùng, dòng thiếu email); kế hoạch dọn user test sau khi chạy. | A | TC-08…12 chạy lại nhiều lần không trùng | 🔄 5 file CSV đã có trong `automation/fixtures/` |
| **X3** | Biên bản thủ công cho TC-03, 04, 05, 07 (chưa có tài khoản Google và hộp thư test): mẫu biên bản, thư mục `docs/testing/manual-tests/`, ảnh chụp và kết quả. | A | Có biên bản hoặc ghi rõ lý do chưa test được | ⬜ |
| **X4** | Fixtures: commit 5 file CSV và 14 kịch bản bài nộp (hiện có **13**, thiếu 1); lấy lời giải tham chiếu Lab 1 và chỉnh `valid_full`; chạy từng kịch bản trên website thật, ghi điểm thực tế và cập nhật README fixtures. Thêm biến thể cho TC-16 (MMD sai một phần), TC-17 (sai access modifier), TC-18 (assertion động), TC-19, TC-20 (thiếu trụ cột / thiếu challenge). | B | Mỗi kịch bản có điểm thực tế ghi lại, đã commit | 🔄 |
| **X5** | Dữ liệu cho `Test_Data` của B: danh sách kịch bản với tên thư mục, điểm mong đợi theo kết quả thật – phục vụ **D6**. | B | Bảng kịch bản và điểm, dùng cho migration 003 | ⬜ |
| **X6** | Dữ liệu giảng viên: tên Lab test (`AUTOTEST_Lab`), lớp, field, method, quan hệ MMD, testcase vận hành (Example và Hidden) cho TC-23…26; mã Java tham chiếu cho dry-run TC-27 (dùng chung với B). | C | Bộ dữ liệu cấu hình sẵn dùng cho spec | 🔄 **Thiết kế xong** → [`../testing/lecturer-test-data.md`](../testing/lecturer-test-data.md) mục 1–6. Còn phải tạo thật trên web và ghi kết quả. |
| **X7** | Dữ liệu cho TC-28, 29, 30: cần Lab có bài nộp của sinh viên (dùng bài nộp do B chạy ra), thư mục lưu file xuất Excel/PDF/SVG và cách kiểm tra file tải về. | C | Có Lab với dữ liệu nộp bài và thư mục `downloads` | 🔄 **Thiết kế xong** → [`../testing/lecturer-test-data.md`](../testing/lecturer-test-data.md) mục 7–10. Còn chờ bài nộp từ X4 của B. |

---

## 4. Thứ tự và phụ thuộc

| Giai đoạn | Nội dung | Mốc |
| :-: | --- | --- |
| **1** | D0, D1 (C) và X0, X1 (B, A) | Helper chạy được, có thông tin tài khoản |
| **2** | D2, D3 (C); X2, X4 (A, B); sửa 4 test đang fail (TC-09, 13, 14, 15) | Từ 10 test pass, không timeout |
| **3** | D4 → D8 theo từng lô, kèm X5, X6, X7 | Mỗi lô: chạy thật → ghi DB → sửa spec dùng DB |
| **4** | D9, D10, X3 | Báo cáo PDF từ DB, biên bản thủ công |

**Phụ thuộc chính:** mọi spec đọc DB đều cần **D1** (helper) và **D0** (quy ước) → C làm hai việc này trước tiên.
B cung cấp bài nộp cho C ở **X7** và mã Java tham chiếu cho **TC-27**.
Không viết migration steps/data cho TC chưa chạy thử trên hệ thống thật.

## 5. Rủi ro riêng của hướng b

- **Nhiều việc hơn hướng a:** mỗi TC có thêm bước viết migration và sửa spec đọc DB. Nếu quá tải, ưu tiên các TC của lô đã pass trước.
- **Spec phụ thuộc DB:** nếu DB không kết nối được thì test không chạy. Helper nên báo lỗi rõ ràng, **không dùng dữ liệu mặc định ngầm**.
- **Dữ liệu trong DB có thể lệch với website** khi website cập nhật → cập nhật migration mới (`005…`) thay vì sửa file cũ.
- **Không đưa mật khẩu thật, token hay thông tin cá nhân** vào DB hoặc git.
- **Backend trên Render hay chậm:** giữ `workers = 1` và tăng timeout.

---

**Chú giải tiến độ:** ✅ xong · 🔄 đang làm / làm một phần · ⬜ chưa bắt đầu
