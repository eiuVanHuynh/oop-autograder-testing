# Danh sách API Endpoint (bản đề xuất)

> Tài liệu này liệt kê các "cổng giao tiếp" (endpoint) mà **Backend** cần cung cấp để **Frontend** (giao diện web) và **bộ test tự động (Playwright)** sử dụng.
---

## 0. Giải Thích Thuật Ngữ
### Endpoint là gì?

Endpoint là 1 phần của back-end, nơi front-edn gửi yêu cầu và lại kết quả.

### IMPORTANCE
Mọi endpoint đều bắt đầu bằng `/api`. Ví dụ `POST /auth/login` nghĩa là gửi đến `http://<địa-chỉ-server>/api/auth/login`.

### Method (động từ đứng đầu) nghĩa là gì?

| Method   | Ý nghĩa dễ hiểu                                  | 
| -------- | ------------------------------------------------ | 
| `GET`    | **Xem / lấy** dữ liệu, không làm thay đổi gì     | 
| `POST`   | **Tạo mới** hoặc **ra lệnh làm một việc**         | 
| `PUT`    | **Sửa toàn bộ** một thứ đã có                    | 
| `PATCH`  | **Sửa một phần** một thứ đã có                   | 
| `DELETE` | **Xóa**                                           | 

### `:id` trong đường dẫn là gì?

Là chỗ để **điền mã số cụ thể**. Ví dụ `GET /runs/:id` → muốn xem lần chạy số 15 thì gọi `GET /runs/15`.

### `?q=&status=` ở cuối là gì?

Là **bộ lọc tùy chọn**. Ví dụ `GET /runs?status=failed` → chỉ lấy các lần chạy bị lỗi. Không ghi thì lấy tất cả.

### Ký hiệu quyền hạn

| Ký hiệu       | Ai được dùng                                                         |
| ------------- | -------------------------------------------------------------------- |
| **Công khai** | Ai cũng dùng được, **không cần đăng nhập**                           |
| **Mọi user**  | Bất kỳ ai **đã đăng nhập** (Admin, Tester, Viewer)                   |
| **Admin**     | Chỉ quản trị viên                                                    |
| **Tester**    | Người kiểm thử (được chạy test, quản lý template)                    |
| **Viewer**    | Người xem (chỉ được xem, không được chạy hay sửa gì)                 |
| **Máy (API key)** | Không phải người, mà là **bộ test tự động** gửi kết quả lên, dùng "chìa khóa máy" riêng |

> ⚠️ **Quan trọng:** Việc chặn quyền phải làm ở **cả 2 nơi**: giao diện ẩn nút đi **và** Backend từ chối (trả `403`). Chỉ ẩn nút là chưa đủ, vì người rành kỹ thuật vẫn có thể gửi yêu cầu trực tiếp.

### Mã trạng thái (Status code) – Backend trả lời "kết quả thế nào"

| Mã    | Tên                   | Ý nghĩa dễ hiểu                                                              |
| ----- | --------------------- | ---------------------------------------------------------------------------- |
| `200` | OK                    | Thành công, có dữ liệu trả về                                             |
| `201` | Created               | Tạo mới thành công                                                        |
| `202` | Accepted              | Đã nhận lệnh, **đang xử lý ở phía sau** (ví dụ: test đang chạy)          |
| `204` | No Content            | Thành công nhưng không cần trả dữ liệu (thường dùng khi xóa)             |
| `302` | Redirect              | Chuyển hướng sang trang khác (dùng khi đăng nhập Google)                 |
| `400` | Bad Request           | Dữ liệu gửi lên **sai / thiếu** (ví dụ: email sai định dạng, bỏ trống)    |
| `401` | Unauthorized          | **Chưa đăng nhập**, hoặc phiên đăng nhập đã hết hạn                      |
| `403` | Forbidden             | Đã đăng nhập nhưng **không đủ quyền** (ví dụ: Viewer bấm "Run Test")     |
| `404` | Not Found             | **Không tìm thấy** thứ được yêu cầu (ví dụ: mã số không tồn tại)         |
| `409` | Conflict              | **Bị trùng / xung đột** (ví dụ: email đã có người đăng ký)               |
| `410` | Gone                  | Thứ này **đã hết hạn** (ví dụ: link chia sẻ quá hạn)                     |
| `413` | Payload Too Large     | File gửi lên **quá lớn**                                                 |
| `423` | Locked                | Tài khoản **đang bị khóa**                                               |
| `429` | Too Many Requests     | Gửi **quá nhiều lần** trong thời gian ngắn (chống spam / dò mật khẩu)   |
| `500` | Internal Server Error | **Lỗi phía server** – không phải lỗi người dùng. Có thể xảy ra với mọi endpoint nên không ghi lặp lại ở bảng dưới |

### Mức độ ưu tiên

- 🔴 **Cần thiết** – phải có để các trang trong thiết kế hoạt động.
- 🟡 **Tiềm năng** – hay, nên có, nhưng làm sau nếu thiếu thời gian.

---

## 1. Xác thực tài khoản (Đăng nhập / Đăng ký)

Phục vụ các trang: **Login, Register, Forgot password**.

| Ưu tiên | Endpoint | Quyền hạn | Status code | Ghi chú |
| :-: | --- | --- | --- | --- |
| 🔴 | `POST /auth/register` | Công khai | `201`, `400`, `409`, `429` | **Đăng ký tài khoản mới.** Gửi lên: họ tên, email, mật khẩu, nhập lại mật khẩu. Tài khoản mới **luôn là Viewer**, Admin sẽ nâng quyền sau. Trả `409` nếu email đã có người dùng. |
| 🔴 | `POST /auth/login` | Công khai | `200`, `400`, `401`, `423`, `429` | **Đăng nhập.** Gửi email + mật khẩu (+ "Ghi nhớ đăng nhập"). Thành công thì trả về **"vé vào cửa" (token)** và thông tin user kèm vai trò. Sai mật khẩu → `401`. Tài khoản bị khóa → `423`. Thử sai quá nhiều lần → `429`. |
| 🔴 | `GET /auth/me` | Mọi user | `200`, `401` | **"Tôi là ai?"** Khi người dùng mở lại web (F5), giao diện gọi cái này để biết họ còn đăng nhập không và có vai trò gì, từ đó ẩn/hiện nút cho đúng. |
| 🔴 | `POST /auth/logout` | Mọi user | `204`, `401` | **Đăng xuất.** Hủy "vé vào cửa" hiện tại. |
| 🔴 | `POST /auth/forgot-password` | Công khai | `200`, `400`, `429` | **Quên mật khẩu.** Gửi email lên, hệ thống gửi link đặt lại mật khẩu về email. Luôn trả `200` **kể cả khi email không tồn tại** – để kẻ xấu không dò được email nào có trong hệ thống. |
| 🔴 | `POST /auth/reset-password` | Công khai | `200`, `400`, `410` | **Đặt mật khẩu mới** bằng mã trong link email. Link quá hạn hoặc đã dùng rồi → `410`. *(Không cần lưu vào DB: mã là token có hạn 15 phút, tự mất hiệu lực sau khi đổi mật khẩu.)* |
| 🔴 | `GET /auth/google` | Công khai | `302` | **Đăng nhập bằng Google** – chuyển người dùng sang trang của Google. |
| 🔴 | `GET /auth/google/callback` | Công khai | `302`, `401` | Google **trả người dùng về** đây sau khi họ đồng ý. Backend tạo/tìm tài khoản rồi chuyển về Dashboard. Người dùng bấm "Hủy" trên Google → `401`. |

---

## 2. Quản lý thành viên (chỉ Admin)

Phục vụ trang: **User Management** (tab trong trang Lịch sử).

| Ưu tiên | Endpoint | Quyền hạn | Status code | Ghi chú |
| :-: | --- | --- | --- | --- |
| 🔴 | `GET /users?q=&role=&status=&page=` | Admin | `200`, `401`, `403` | **Xem danh sách thành viên.** Có thể tìm theo tên/email (`q`), lọc theo vai trò, theo trạng thái (đang hoạt động / bị khóa), và chia trang. |
| 🔴 | `PATCH /users/:id/role` | Admin | `200`, `400`, `401`, `403`, `404` | **Đổi vai trò** cho một người: Admin / Tester / Viewer. Không cho Admin **tự hạ quyền chính mình** (tránh trường hợp hệ thống không còn Admin nào) → `400`. |
| 🔴 | `PATCH /users/:id/status` | Admin | `200`, `400`, `401`, `403`, `404` | **Khóa / Mở khóa tài khoản.** Người bị khóa sẽ không đăng nhập được nữa. Không cho Admin tự khóa mình → `400`. |
| 🟡 | `PATCH /users/me` | Mọi user | `200`, `400`, `401` | **Tự sửa hồ sơ cá nhân** (họ tên, ảnh đại diện). |
| 🟡 | `PATCH /users/me/password` | Mọi user | `200`, `400`, `401` | **Đổi mật khẩu** (phải nhập đúng mật khẩu cũ). Sai mật khẩu cũ → `400`. |
| 🟡 | `DELETE /users/:id` | Admin | `204`, `401`, `403`, `404` | **Xóa hẳn tài khoản.** Khuyến nghị: nên **khóa** thay vì xóa, để lịch sử "ai đã chạy test nào" không bị mất. |

---

## 3. Thống kê cho Dashboard

Phục vụ trang: **Dashboard** (các thẻ số liệu + biểu đồ).

| Ưu tiên | Endpoint | Quyền hạn | Status code | Ghi chú |
| :-: | --- | --- | --- | --- |
| 🔴 | `GET /stats/summary` | Mọi user | `200`, `401` | **Số liệu tổng quan** cho các thẻ trên cùng: tổng số lần chạy, tỷ lệ đạt (%), số test đang chạy, lần lỗi gần nhất. |
| 🔴 | `GET /stats/daily?days=7` | Mọi user | `200`, `400`, `401` | **Dữ liệu cho biểu đồ** số test Đạt/Lỗi theo từng ngày. `days=7` nghĩa là lấy 7 ngày gần nhất. Số ngày không hợp lệ (ví dụ âm) → `400`. |
| 🔴 | `GET /runs?limit=10` | Mọi user | `200`, `401` | **Bảng "test chạy gần đây"** – dùng lại endpoint ở mục 6, chỉ lấy 10 dòng mới nhất. |
| 🟡 | `GET /stats/flaky` | Mọi user | `200`, `401` | **Danh sách test "chập chờn"** – lúc đạt lúc lỗi, cần xem lại. |
| 🟡 | `GET /stats/by-scope` | Mọi user | `200`, `401` | **Tỷ lệ đạt theo phạm vi** (giao diện UI / API / Database). |

---

## 4. Kịch bản mẫu (Template)

Phục vụ trang: **Template Management** và **ô "Chọn Template"** trong trang Tạo Test.

> Template = **mẫu điền sẵn**. Chọn một mẫu thì form tạo test tự điền Tên, Yêu cầu, Kết quả mong đợi → đỡ phải gõ lại.
> *(DB hiện **chưa có bảng `templates`**, cần bổ sung.)*

| Ưu tiên | Endpoint | Quyền hạn | Status code | Ghi chú |
| :-: | --- | --- | --- | --- |
| 🔴 | `GET /templates?q=` | Mọi user | `200`, `401` | **Xem danh sách template.** Dùng cho cả bảng quản lý lẫn ô chọn. `q` để tìm theo tên. |
| 🔴 | `GET /templates/:id` | Mọi user | `200`, `401`, `404` | **Xem chi tiết 1 template** – giao diện lấy nội dung này để tự điền vào form. |
| 🔴 | `POST /templates` | Admin, Tester | `201`, `400`, `401`, `403`, `409` | **Tạo template mới.** Nút "Lưu thành Template" ở trang Tạo Test cũng gọi cái này. Trùng tên với template đã có → `409`. Viewer gọi → `403`. |
| 🔴 | `PUT /templates/:id` | Admin, Tester | `200`, `400`, `401`, `403`, `404` | **Sửa template.** Hệ thống tự cập nhật "ngày cập nhật". |
| 🔴 | `DELETE /templates/:id` | Admin, Tester | `204`, `401`, `403`, `404` | **Xóa template.** Giao diện nên hỏi "Bạn chắc chắn chứ?" trước khi gọi. |
| 🟡 | `POST /templates/:id/duplicate` | Admin, Tester | `201`, `401`, `403`, `404` | **Nhân bản template** để sửa thành bản mới mà không phải nhập lại từ đầu. |

---

## 5. Cấu hình test & Bản nháp

Phục vụ trang: **Create new test** (nút "Lưu nháp").

| Ưu tiên | Endpoint | Quyền hạn | Status code | Ghi chú |
| :-: | --- | --- | --- | --- |
| 🔴 | `POST /tests` | Admin, Tester | `201`, `400`, `401`, `403` | **Lưu nháp** một cấu hình test: tên, yêu cầu, phạm vi (UI/API/DB), kết quả mong đợi, môi trường, thời gian chờ tối đa. Thiếu tên → `400`. |
| 🔴 | `GET /tests?status=draft` | Admin, Tester | `200`, `401`, `403` | **Xem danh sách bản nháp** đã lưu để mở lại làm tiếp. |
| 🔴 | `GET /tests/:id` | Admin, Tester | `200`, `401`, `403`, `404` | **Mở lại 1 bản nháp.** |
| 🔴 | `PUT /tests/:id` | Admin, Tester | `200`, `400`, `401`, `403`, `404` | **Sửa bản nháp.** |
| 🔴 | `DELETE /tests/:id` | Admin, Tester | `204`, `401`, `403`, `404` | **Xóa bản nháp.** |
| 🟡 | `POST /tests/:id/attachments` | Admin, Tester | `201`, `400`, `401`, `403`, `404`, `413` | **Đính kèm file** (ví dụ file dữ liệu mẫu). File quá lớn → `413`. Sai loại file → `400`. |
| 🟡 | `GET /meta/options` | Mọi user | `200`, `401` | **Lấy các lựa chọn có sẵn** (danh sách phạm vi, môi trường, vai trò…) để giao diện không phải tự ghi cứng – khi cần thêm lựa chọn chỉ sửa ở Backend. |

---

## 6. Chạy test (phần quan trọng nhất)

Phục vụ trang: **Create new test** (nút Run + khung log), **RunDetail**, **Test History**.

> "Run" = **một lần chạy test**. Mỗi lần bấm "Run Test" sẽ tạo ra một Run mới có mã số riêng.

| Ưu tiên | Endpoint | Quyền hạn | Status code | Ghi chú |
| :-: | --- | --- | --- | --- |
| 🔴 | `POST /runs` | Admin, Tester | `202`, `400`, `401`, `403`, `404` | **Bấm "Run Test".** Backend nhận lệnh và trả về **mã số lần chạy** ngay (`202` = "đã nhận, đang chạy") – không bắt người dùng chờ chạy xong. Giao diện dùng mã số này để theo dõi log. Template/bản nháp không tồn tại → `404`. Viewer gọi → `403`. |
| 🔴 | `GET /runs?q=&status=&from=&to=&page=` | Mọi user | `200`, `400`, `401` | **Lịch sử chạy test.** Tìm theo tên (`q`), lọc Đạt/Lỗi (`status`), lọc theo khoảng ngày (`from`→`to`), chia trang. Mỗi dòng có: mã, tên, người chạy, thời gian, trạng thái. Ngày sai định dạng → `400`. |
| 🔴 | `GET /runs/:id` | Mọi user | `200`, `401`, `404` | **Xem chi tiết 1 lần chạy** (trang báo cáo): Đạt hay Lỗi, chạy mất bao lâu, chạy lúc nào, **so sánh Kết quả mong đợi vs Kết quả thực tế**, và bảng từng bước. |
| 🔴 | `GET /runs/:id/logs/stream` | Mọi user | `200`, `401`, `404` | **Xem log trực tiếp** (chữ chạy liên tục trong khung log + thanh tiến độ). Kết nối được **giữ mở**, server có gì mới là đẩy ngay xuống – người dùng không cần bấm tải lại. *(Kỹ thuật: SSE.)* |
| 🔴 | `GET /runs/:id/logs?after=` | Mọi user | `200`, `401`, `404` | **Phương án dự phòng** cho cái trên: giao diện **cứ vài giây hỏi một lần** "có log mới không?". `after` = "lấy các dòng sau dòng số X". Cần vì khi deploy lên **Vercel**, kết nối giữ mở lâu có thể bị cắt. |
| 🔴 | `POST /runs/:id/cancel` | Admin, Tester | `200`, `401`, `403`, `404`, `409` | **Bấm "Hủy"** để dừng test đang chạy. Test đã chạy xong rồi thì không hủy được → `409`. |
| 🔴 | `POST /runs/:id/rerun` | Admin, Tester | `202`, `401`, `403`, `404` | **Bấm "Chạy lại"** – tạo một lần chạy **mới** với cùng cấu hình. Lần chạy cũ vẫn được giữ trong lịch sử. |
| 🟡 | `GET /runs/:id/results/:resultId/evidences` | Mọi user | `200`, `401`, `404` | **Xem bằng chứng** của một bước bị lỗi: ảnh chụp màn hình, file ghi lại quá trình chạy (trace). |
| 🟡 | `DELETE /runs/:id` | Admin | `204`, `401`, `403`, `404`, `409` | **Xóa một lần chạy** khỏi lịch sử. Đang chạy dở → `409` (phải hủy trước). |

---

## 7. Báo cáo, Xuất file & Chia sẻ

Phục vụ trang: **RunDetail** (nút Tải PDF / Export HTML / Copy link) và **Test History** (cột tick chọn để xuất nhiều cái).

| Ưu tiên | Endpoint | Quyền hạn | Status code | Ghi chú |
| :-: | --- | --- | --- | --- |
| 🔴 | `GET /runs/:id/export?format=pdf` | Mọi user | `200`, `400`, `401`, `404`, `409` | **Tải báo cáo** của 1 lần chạy. `format=pdf` hoặc `format=html`. Định dạng không hỗ trợ → `400`. Test chưa chạy xong → `409`. Mỗi lần xuất sẽ được lưu vào bảng `reports` (ai xuất, lúc nào). *(DB hiện chỉ cho `pdf`, cần thêm `html`.)* |
| 🔴 | `POST /runs/export` | Mọi user | `200`, `400`, `401`, `404` | **Xuất nhiều báo cáo cùng lúc** – người dùng tick chọn nhiều dòng trong Lịch sử rồi bấm Xuất. Gửi lên danh sách mã + định dạng, nhận về **1 file nén (.zip)**. Không chọn dòng nào → `400`. |
| 🟡 | `POST /runs/:id/share` | Mọi user | `201`, `401`, `404` | **Tạo link chia sẻ** – gửi cho người ngoài xem báo cáo mà **không cần tài khoản**. Link có hạn sử dụng (ví dụ 7 ngày). |
| 🟡 | `GET /share/:token` | Công khai | `200`, `404`, `410` | **Người nhận mở link chia sẻ.** Link sai → `404`. Link hết hạn → `410`. Chỉ xem được, không sửa/chạy được gì. |

---

## 8. Nhận kết quả từ bộ test tự động (Máy gửi lên)

Đây là **cửa sau dành cho máy**, không phải cho người. Khi Playwright chạy test xong (trên máy hoặc trên CI), nó tự gửi kết quả lên Backend qua các endpoint này để lưu vào Database. Giao diện web **không** gọi các endpoint này.

> Dùng **"chìa khóa máy" (API key)** thay vì đăng nhập. Sai/thiếu chìa khóa → `401`.

| Ưu tiên | Endpoint | Quyền hạn | Status code | Ghi chú |
| :-: | --- | --- | --- | --- |
| 🔴 | `POST /ingest/runs` | Máy (API key) | `201`, `400`, `401` | **Báo "bắt đầu chạy"** – tạo một lần chạy mới, kèm thông tin: trình duyệt, môi trường, nhánh code, người chạy. |
| 🔴 | `POST /ingest/runs/:id/results` | Máy (API key) | `201`, `400`, `401`, `404` | **Gửi kết quả từng test case**: đạt/lỗi, kết quả thực tế, thời gian chạy, thông báo lỗi. Có thể gửi nhiều kết quả một lúc. |
| 🔴 | `POST /ingest/runs/:id/logs` | Máy (API key) | `202`, `400`, `401`, `404` | **Gửi từng dòng log** khi đang chạy, để người xem trên web thấy chữ chạy trực tiếp (mục 6). *(Log chỉ lưu tạm, bị xóa sau khi lần chạy kết thúc.)* |
| 🔴 | `PATCH /ingest/runs/:id/finish` | Máy (API key) | `200`, `400`, `401`, `404`, `409` | **Báo "đã chạy xong"** – ghi giờ kết thúc và kết quả chung. Gọi 2 lần cho cùng một lần chạy → `409`. |
| 🟡 | `POST /ingest/results/:id/evidences` | Máy (API key) | `201`, `400`, `401`, `404`, `413` | **Gửi ảnh chụp màn hình / file trace** của test bị lỗi. File quá lớn → `413`. |

---

## 9. Danh mục test case (bộ test, đặc tả, test case, các bước)

Quản lý dữ liệu test gốc đã có trong Database (`test_suites`, `test_specs`, `test_cases`, `test_steps`, `test_data`). Hiện chưa có trang giao diện riêng nên để mức Tiềm năng.

| Ưu tiên | Endpoint | Quyền hạn | Status code | Ghi chú |
| :-: | --- | --- | --- | --- |
| 🟡 | `GET /suites` | Mọi user | `200`, `401` | **Xem danh sách bộ test** (ví dụ: bộ test Đăng nhập, bộ test Giảng viên…). |
| 🟡 | `GET /suites/:id/specs` | Mọi user | `200`, `401`, `404` | **Xem các đặc tả** (yêu cầu) thuộc một bộ test. |
| 🟡 | `GET /cases?suite=&type=&priority=` | Mọi user | `200`, `401` | **Xem danh sách test case**, lọc theo bộ test, loại test, mức độ ưu tiên. |
| 🟡 | `GET /cases/:id` | Mọi user | `200`, `401`, `404` | **Xem chi tiết 1 test case**, kèm các bước thực hiện và dữ liệu test. |
| 🟡 | `POST /suites`, `POST /specs`, `POST /cases` | Admin, Tester | `201`, `400`, `401`, `403`, `409` | **Tạo mới** bộ test / đặc tả / test case. Trùng mã (ví dụ trùng `TC-LOGIN-001`) → `409`. |
| 🟡 | `PUT /suites/:id`, `PUT /specs/:id`, `PUT /cases/:id` | Admin, Tester | `200`, `400`, `401`, `403`, `404` | **Sửa** bộ test / đặc tả / test case. |
| 🟡 | `DELETE /suites/:id`, `DELETE /specs/:id`, `DELETE /cases/:id` | Admin, Tester | `204`, `401`, `403`, `404`, `409` | **Xóa.** Không xóa được nếu bên trong vẫn còn dữ liệu con (ví dụ bộ test vẫn còn đặc tả) → `409`. Nên đổi trạng thái test case thành "ngừng dùng" thay vì xóa. |
| 🟡 | `PUT /cases/:id/steps` | Admin, Tester | `200`, `400`, `401`, `403`, `404` | **Sửa lại toàn bộ các bước** của một test case (thêm/bớt/đổi thứ tự). |

---

## 10. Báo lỗi (Bug)

Cho phép người dùng **báo một lỗi phần mềm** từ một kết quả test bị Fail. *(Bảng `Bug_Feedbacks` trong DB đang tạm tắt.)*

| Ưu tiên | Endpoint | Quyền hạn | Status code | Ghi chú |
| :-: | --- | --- | --- | --- |
| 🟡 | `POST /results/:id/bugs` | Admin, Tester | `201`, `400`, `401`, `403`, `404`, `409` | **Tạo báo cáo lỗi** từ một kết quả test. Gửi lên: tiêu đề, mô tả, mức độ nghiêm trọng. **Chỉ báo được khi kết quả đó là Fail** – nếu test đã Đạt thì trả `409`. |
| 🟡 | `GET /bugs?status=&severity=` | Mọi user | `200`, `401` | **Xem danh sách lỗi**, lọc theo trạng thái (mới / đang xử lý / đã sửa / đóng) và mức độ nghiêm trọng. |
| 🟡 | `PATCH /bugs/:id` | Admin, Tester | `200`, `400`, `401`, `403`, `404` | **Cập nhật lỗi** – thường là đổi trạng thái (ví dụ: "đang xử lý" → "đã sửa"). |

---

## 11. Hệ thống

| Ưu tiên | Endpoint | Quyền hạn | Status code | Ghi chú |
| :-: | --- | --- | --- | --- |
| 🔴 | `GET /health` | Công khai | `200`, `503` | **Kiểm tra "server còn sống không"**. Trả `200` nếu server và Database đều ổn, `503` nếu không kết nối được Database. Dùng để kiểm tra sau khi deploy và cho bộ test kết nối DB. |

---

## Phụ lục A – Ma trận phân quyền tóm tắt

Nguồn chuẩn về vai trò: [`../architecture/SRS.md`](../architecture/SRS.md) mục 4, khớp `ENUM('admin','tester','dev','viewer')` trong `db/schema/`.

| Chức năng | Admin | Tester | Dev | Viewer |
| --- | :-: | :-: | :-: | :-: |
| Xem Dashboard, Lịch sử, Báo cáo, Template | ✔ | ✔ | ✔ | ✔ |
| Xem log, chuỗi bước chi tiết, bằng chứng | ✔ | ✔ | ✔ | ✔ |
| Xuất báo cáo, tạo link chia sẻ | ✔ | ✔ | ✔ | ✔ |
| Request chạy lại | ✔ | ✔ | ✔ | ✘ |
| Chạy test / Hủy | ✔ | ✔ | ✘ | ✘ |
| Lưu nháp cấu hình test | ✔ | ✔ | ✘ | ✘ |
| Thêm / sửa / xóa Template | ✔ | ✔ | ✘ | ✘ |
| Báo lỗi (Bug) | ✔ | ✔ | ✔ | ✘ |
| Quản lý thành viên (đổi vai trò, khóa tài khoản) | ✔ | ✘ | ✘ | ✘ |
| Xóa lần chạy khỏi lịch sử | ✔ | ✘ | ✘ | ✘ |

> ⚠️ Vai trò **Dev** mới được giữ lại theo nguồn chuẩn (trước đó `backend-design.md` đề xuất bỏ). Các dòng của `Dev` ở trên là
> **suy ra từ SRS mục 4**, nhóm cần xác nhận – nhất là "Request chạy lại" (gửi yêu cầu cho Admin/Tester hay tự gọi `POST /runs`?)
> và quyền báo lỗi. Bảng ký hiệu quyền hạn ở mục 0 cũng cần bổ sung dòng **Dev**.

## Phụ lục B – Những thứ Database cần bổ sung để làm được các endpoint trên

1. **Bảng `templates`** – lưu kịch bản mẫu (mục 4).
2. **Bảng lưu bản nháp cấu hình test** (mục 5), hoặc gộp chung với `templates` bằng một cột phân loại.
3. **Bảng lưu log tạm** `run_logs` (mã lần chạy, số thứ tự dòng, nội dung, thời gian) – cho khung log trực tiếp (mục 6, 8). Log bị **xóa sau khi lần chạy kết thúc**. Câu lệnh `CREATE TABLE` có sẵn ở [`backend-design.md`](./backend-design.md) mục 6.
4. **2 cột mới cho `test_runs`**: `run_name` và `config_json` (phục vụ "Chạy lại") – xem [`backend-design.md`](./backend-design.md) mục 6.
5. ~~Bảng lưu mã đặt lại mật khẩu~~ – **không cần**: dùng token có hạn, không lưu trữ (xem [`backend-design.md`](./backend-design.md) mục 6).

## Phụ lục C – Thứ tự nên làm (nếu thiếu thời gian)

1. Mục 1 – Xác thực
2. Mục 6 + 8 – Chạy test & nhận kết quả
3. Mục 7 – Xuất báo cáo
4. Mục 2 – Quản lý thành viên
5. Mục 3 – Dashboard
6. Mục 4 + 5 – Template & bản nháp
7. Các mục 🟡 Tiềm năng còn lại
