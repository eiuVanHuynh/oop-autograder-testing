# Dữ liệu đầu vào để kiểm thử OOP AutoGrader

Thư mục này chứa **file dùng để đưa vào hệ thống OOP AutoGrader** khi chạy Playwright (CSV, bài nộp mẫu).
Không phải dữ liệu thiết kế test (cái đó nằm trong `db/seed/`) và không phải dữ liệu lấy từ OOP AutoGrader.

## Lưu ý trước khi dùng

1. **Nội dung Java/MMD là mẫu tự đặt** (Lab 1: challenge_1 = `Student`, challenge_2 = `Shape`/`Circle`). Rubric thật của Lab 1 do giảng viên định nghĩa, nên `valid_full` chỉ đạt điểm tối đa khi **tên lớp, field, method khớp rubric thật**. Cách xử lý: lấy lời giải tham chiếu của Lab 1 (trang Solution của giảng viên, hoặc hỏi giảng viên) và ghi đè 4 file trong `submissions/valid_full/`. Các biến thể khác chỉ khác `valid_full` đúng một chỗ (xem cột "Khác với valid_full"), sửa theo tương ứng.
2. **Tên thư mục gốc** `20211001_NguyenVanA_lab_1` là tên mẫu. Nếu hệ thống đối chiếu IRN trong tên thư mục với tài khoản đang đăng nhập, dùng `tests/utils/fixture-builder.js` để copy sang thư mục tạm và đổi tên theo `TEST_STUDENT_IRN`.
3. **Mọi thứ nhập vào đều tạo dữ liệu thật** trên hệ thống đang test (tài khoản từ CSV, bài nộp). Chỉ dùng dữ liệu giả như trong thư mục này, và nên hỏi giảng viên cách dọn dữ liệu test.
4. Các kỳ vọng ở bảng dưới là **dự kiến theo `docs/test-case-matrix.md`**, cần đối chiếu với hành vi thật khi chạy lần đầu rồi cập nhật.

## CSV cho TC-09 (nhập user hàng loạt)

Header dùng `irn,email` theo mô tả "danh sách IRN và email sinh viên". **Cần xác nhận** với mẫu/thông báo lỗi của chức năng Import trên hệ thống (có thể cần thêm cột tên, hoặc viết hoa tiêu đề).
IRN dùng đầu `2099` (10 chữ số, giả) để không trùng sinh viên thật.

| File | Nội dung | Kết quả dự kiến |
|---|---|---|
| `student_list_batch1.csv` | 5 dòng hợp lệ | Nhập thành công 5 tài khoản. Chạy lần 2 sẽ báo trùng |
| `student_list_invalid_rows.csv` | 2 dòng hợp lệ + email sai, thiếu IRN, IRN không phải số, thiếu email | Chỉ 2 dòng hợp lệ được nhập, các dòng lỗi được báo cụ thể |
| `student_list_duplicate.csv` | 1 IRN xuất hiện 2 lần | Hệ thống phát hiện trùng, không tạo 2 tài khoản |
| `student_list_empty.csv` | Chỉ có header | Báo file không có dữ liệu |
| `student_list_wrong_format.txt` | Không phải CSV | Bị từ chối |

## Bài nộp cho TC-13 → TC-22

Mỗi kịch bản là một thư mục gốc hoàn chỉnh, có thể upload nguyên thư mục. Mỗi kịch bản (trừ khi ghi khác) có `challenge_1` và `challenge_2`, mỗi challenge gồm `Solution.java` + `Diagram.mmd`.

| Kịch bản (`submissions/...`) | Test case | Khác với valid_full | Kết quả dự kiến |
|---|---|---|---|
| `valid_full` | TC-14, 21, 22 | (bản gốc) | Biên dịch, chấm đủ 3 trụ cột, hiện tổng điểm |
| `invalid_subfolder_name` | TC-15 | `challenge_1` đổi thành `chall_1_wrong` | challenge_1 = 0 điểm, challenge_2 vẫn được chấm |
| `invalid_root_name` | TC-15 | Thư mục gốc đổi thành `lab1_bai_nop` | Bị từ chối hoặc 0 điểm (xác nhận hành vi thật) |
| `missing_challenge` | TC-20 | Không có `challenge_2` | challenge_2 = 0, tổng điểm tính theo trọng số cả lab |
| `mmd_partial_wrong` | TC-16 | Diagram: `Shape --> Circle` thay `Shape <\|-- Circle`; `gpa` đổi `-` thành `+`, bỏ `isHonor` | Trụ cột MMD mất điểm phần sai |
| `declaration_partial_wrong_modifier` | TC-17 | challenge_1: `private double gpa` thành `public double gpa` | Điểm một phần ở trụ cột Declaration |
| `declaration_missing_method` | TC-17 | challenge_1: thiếu `getName()` | Mất điểm method thiếu |
| `operational_logic_wrong` | TC-18 | challenge_1: `setGpa` không kiểm tra miền 0-4, `isHonor` ngưỡng 3.6 thay 3.2 | Khai báo đúng nhưng một số testcase vận hành fail |
| `no_diagram` | TC-19 (phía sinh viên) | Không có file `Diagram.mmd` | Trụ cột MMD bị bỏ qua/0 điểm tùy rubric |
| `compile_error` | Giá trị biên | challenge_1: thiếu dấu `;` | Báo lỗi biên dịch, hệ thống không crash |
| `empty_files` | Giá trị biên | Mọi file rỗng | 0 điểm, không crash |
| `wrong_extension` | Giá trị biên (Dropzone) | `.txt` thay `.java`/`.mmd` | Bị từ chối hoặc bỏ qua |
| `infinite_loop` | Giá trị biên (timeout) | challenge_1: `isHonor()` lặp vô hạn | Hết thời gian chờ, hệ thống không treo. **Chỉ chạy khi giảng viên cho phép**, vì có thể chiếm tài nguyên máy chấm dùng chung |

Các file `.java` đã được kiểm tra biên dịch bằng JDK 21: mọi file đều biên dịch được, **trừ** `compile_error/challenge_1` (cố ý lỗi).

## File quá dung lượng

Dropzone nhận tối đa 10 MB. Không commit file lớn vào Git, hãy tạo ngay trong test:

```js
await page.locator('input[type="file"]').setInputFiles({
  name: 'Solution.java',
  mimeType: 'text/plain',
  buffer: Buffer.alloc(11 * 1024 * 1024, 'a'),
});
```

## Dùng trong spec

```js
const { buildSubmission, cleanup } = require('../utils/fixture-builder');

const dir = buildSubmission('valid_full');          // đổi tên thư mục gốc theo TEST_STUDENT_IRN
await page.locator('input[type="file"]').setInputFiles(dir);
// ... assertions ...
cleanup(dir);
```

Đường dẫn cũ trong `submission.spec.js` (`../../fixtures/20211001_NguyenVanA_lab_1/...`) cần đổi sang `../../fixtures/submissions/<kịch bản>/20211001_NguyenVanA_lab_1/...`, hoặc dùng `buildSubmission`.
