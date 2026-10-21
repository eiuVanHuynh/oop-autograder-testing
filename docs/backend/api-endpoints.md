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

## 4. Template – thứ người dùng chọn để chạy

Phục vụ trang: **Template Management** và ô **"Chọn Template"** trong trang Tạo Test.

> **Nhóm đã chốt lại: dùng Template, thay cho Suite.** Một template trỏ thẳng tới *target test* – danh sách
> test sẽ chạy – và nằm ở **bảng mới** `test_templates`. Suite / spec / case vẫn là nơi khai báo test (mục 9).
> Cấu trúc bảng và cách sinh biểu thức `--grep`: [`backend-design.md`](./backend-design.md) mục 7.

| Ưu tiên | Endpoint | Quyền hạn | Status code | Ghi chú |
| :-: | --- | --- | --- | --- |
| 🔴 | `GET /templates?q=&scope=` | Mọi user | `200`, `401` | **Xem danh sách template.** Dùng cho cả bảng quản lý lẫn ô chọn trước khi Run. Nên kèm số test case `ready` mà `target_json` trỏ tới, để giao diện chặn sớm template rỗng. |
| 🔴 | `GET /templates/:id` | Mọi user | `200`, `401`, `404` | **Xem chi tiết 1 template**: mô tả, phạm vi, danh sách test được chọn, môi trường & timeout mặc định. |
| 🔴 | `POST /templates` | Admin, Tester | `201`, `400`, `401`, `403`, `409` | **Tạo template mới.** Bắt buộc có `target_json` (`{ suiteId }` hoặc `{ testIds }`) – thiếu → `400`. Trùng `template_name` → `409`. Viewer gọi → `403`. |
| 🔴 | `PUT /templates/:id` | Admin, Tester | `200`, `400`, `401`, `403`, `404` | **Sửa template.** Sửa xong **không** ảnh hưởng các lần chạy cũ: lịch sử đã chụp `grep` vào `test_runs.config_json`. |
| 🔴 | `DELETE /templates/:id` | Admin, Tester | `204`, `401`, `403`, `404` | **Xóa template.** Lịch sử chạy vẫn giữ nguyên, không `409`. Giao diện nên hỏi xác nhận. |
| 🟡 | `POST /templates/:id/duplicate` | Admin, Tester | `201`, `401`, `403`, `404` | **Nhân bản template** để sửa thành bản mới mà không chọn lại test từ đầu. |

Chọn test để điền vào `target_json`: dùng `GET /suites?q=` và `GET /cases?...` ở mục 9.

---

## 5. ~~Cấu hình test & Bản nháp~~ – ĐÃ BỎ

Mục này phục vụ form nhập "Yêu cầu test" bằng chữ tự do rồi lưu nháp. Form đó **không còn**: người dùng
**chọn một template có sẵn** rồi bấm Run. Muốn lưu một tổ hợp test hay dùng thì **tạo template** (mục 4),
không cần bảng nháp riêng.

| Endpoint cũ | Thay bằng |
| --- | --- |
| `POST/GET/PUT/DELETE /tests` (bản nháp) | ❌ Bỏ. Muốn lưu một tổ hợp test hay dùng → tạo một **template** (mục 4) |
| `POST /tests/:id/attachments` | ❌ Bỏ. Dữ liệu test thuộc `test_data` và `automation/fixtures/`, không upload qua form |
| `GET /meta/options` | ✅ **Giữ lại** – 🟡, Mọi user, `200`/`401`. Trả các lựa chọn có sẵn (môi trường, `priority`, `test_type`, `test_status`) để giao diện không ghi cứng |

---

## 6. Chạy test (phần quan trọng nhất)

Phục vụ trang: **Create new test** (nút Run + khung log), **RunDetail**, **Test History**.

> "Run" = **một lần chạy test**. Mỗi lần bấm "Run Test" sẽ tạo ra một Run mới có mã số riêng.

| Ưu tiên | Endpoint | Quyền hạn | Status code | Ghi chú |
| :-: | --- | --- | --- | --- |
| 🔴 | `POST /runs` | Admin, Tester | `202`, `400`, `401`, `403`, `404`, `409` | **Bấm "Run Test".** Gửi lên `{ templateId, env?, timeout? }` **hoặc** `{ testIds: ["TC-05", …] }`. Backend đọc `target_json` của template, đổi ra biểu thức `--grep`, tạo lần chạy và trả **mã số** ngay (`202` = "đã nhận, đang chạy"). Giao diện dùng mã số này để theo dõi log. Template không tồn tại → `404`. **Template không ra test case `ready` nào → `409`** (không gọi workflow, tránh báo `passed` giả). Viewer gọi → `403`. |
| 🔴 | `GET /runs?q=&status=&from=&to=&page=` | Mọi user | `200`, `400`, `401` | **Lịch sử chạy test.** Tìm theo tên (`q`), lọc Đạt/Lỗi (`status`), lọc theo khoảng ngày (`from`→`to`), chia trang. Mỗi dòng có: mã, tên, người chạy, thời gian, trạng thái. Ngày sai định dạng → `400`. |
| 🔴 | `GET /runs/:id` | Mọi user | `200`, `401`, `404` | **Xem chi tiết 1 lần chạy** (trang báo cáo): Đạt hay Lỗi, chạy mất bao lâu, chạy lúc nào, **so sánh Kết quả mong đợi vs Kết quả thực tế**, và bảng từng bước. |
| 🔴 | `GET /runs/:id/logs/stream` | Mọi user | `200`, `401`, `404` | **Xem log trực tiếp** (chữ chạy liên tục trong khung log + thanh tiến độ). Kết nối được **giữ mở**, server có gì mới là đẩy ngay xuống – người dùng không cần bấm tải lại. *(Kỹ thuật: SSE.)* |
| 🔴 | `GET /runs/:id/logs?after=` | Mọi user | `200`, `401`, `404` | **Phương án dự phòng** cho cái trên: giao diện **cứ vài giây hỏi một lần** "có log mới không?". `after` = "lấy các dòng sau dòng số X". Cần vì khi deploy lên **Vercel**, kết nối giữ mở lâu có thể bị cắt. |
| 🔴 | `POST /runs/:id/cancel` | Admin, Tester | `200`, `401`, `403`, `404`, `409` | **Bấm "Hủy"** để dừng test đang chạy. Test đã chạy xong rồi thì không hủy được → `409`. |
| 🔴 | `POST /runs/:id/rerun` | Admin, Tester | `202`, `401`, `403`, `404` | **Bấm "Chạy lại"** – đọc `test_runs.config_json` của lần chạy cũ và gửi lại y nguyên, tạo một lần chạy **mới**. Lần chạy cũ vẫn giữ trong lịch sử. |
| 🔴 | `GET /runs/:id/results/:resultId/evidences` | Mọi user | `200`, `401`, `404` | **Xem bằng chứng** của một bước – cả bước lỗi lẫn bước đạt: ảnh chụp màn hình, file ghi lại quá trình chạy (trace). |
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

## 9. Bên trong một bộ test: đặc tả, test case, các bước

Quản lý dữ liệu test gốc đã có trong Database (`test_suites`, `test_specs`, `test_cases`, `test_steps`, `test_data`).
Đây là **nơi khai báo test**; còn *chọn test nào để chạy* là việc của Template ở **mục 4**.

Đây là nguồn dữ liệu cho **cả hai phía**: giao diện chọn test để chạy, **và** helper `loadTestCase(tcCode)` mà spec Playwright dùng.

| Ưu tiên | Endpoint | Quyền hạn | Status code | Ghi chú |
| :-: | --- | --- | --- | --- |
| 🔴 | `GET /suites?q=` | Mọi user | `200`, `401` | **Xem danh sách bộ test**, dùng khi chọn `target_json` cho template. Nên kèm số test case `ready` của mỗi suite. |
| 🔴 | `GET /suites/:id/specs` | Mọi user | `200`, `401`, `404` | **Xem các đặc tả** (yêu cầu) thuộc một bộ test. |
| 🔴 | `GET /cases?suite=&type=&priority=&status=` | Mọi user | `200`, `401` | **Xem danh sách test case**, lọc theo bộ test, loại test, mức độ ưu tiên, trạng thái. Giao diện "chọn test lẻ để chạy" dùng cái này. |
| 🔴 | `GET /cases/:id` | Mọi user | `200`, `401`, `404` | **Xem chi tiết 1 test case**, kèm các bước thực hiện và dữ liệu test. |
| 🟡 | `POST /specs`, `POST /cases` | Admin, Tester | `201`, `400`, `401`, `403`, `409` | **Tạo mới** đặc tả / test case. Trùng `spec_code` hoặc `tc_code` → `409` (cả hai cột đều `UNIQUE`). |
| 🟡 | `PUT /specs/:id`, `PUT /cases/:id` | Admin, Tester | `200`, `400`, `401`, `403`, `404` | **Sửa** đặc tả / test case. |
| 🟡 | `DELETE /specs/:id`, `DELETE /cases/:id` | Admin, Tester | `204`, `401`, `403`, `404`, `409` | **Xóa.** Còn dữ liệu con → `409` (`ON DELETE RESTRICT`). Nên đổi `test_status` thành `deprecated` thay vì xóa. |
| 🟡 | `PUT /cases/:id/steps` | Admin, Tester | `200`, `400`, `401`, `403`, `404` | **Sửa lại toàn bộ các bước** của một test case (thêm/bớt/đổi thứ tự). |
| 🟡 | `POST /suites`, `PUT /suites/:id`, `DELETE /suites/:id` | Admin, Tester | `201`/`200`/`204`, `400`, `401`, `403`, `404`, `409` | **CRUD bộ test.** Trùng `suite_name` → `409`; xóa khi bên trong còn đặc tả → `409` (`ON DELETE RESTRICT`). |

> **`test_status` quyết định test có được chạy hay không.** Chỉ `ready` mới vào biểu thức `--grep`;
> `draft` và `deprecated` bị bỏ qua – xem [`backend-design.md`](./backend-design.md) mục 7.3.

---

## 10. Báo lỗi (Bug)

Cho phép người dùng **báo một lỗi phần mềm** từ một kết quả test bị Fail. *(Bảng `Bug_Feedbacks` trong DB đã bị xóa.)*

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
| Thêm / sửa / xóa Template, bộ test, đặc tả, test case | ✔ | ✔ | ✘ | ✘ |
| Báo lỗi (Bug) | ✔ | ✔ | ✔ | ✘ |
| Quản lý thành viên (đổi vai trò, khóa tài khoản) | ✔ | ✘ | ✘ | ✘ |
| Xóa lần chạy khỏi lịch sử | ✔ | ✘ | ✘ | ✘ |

> ⚠️ Vai trò **Dev** mới được giữ lại theo nguồn chuẩn (trước đó `backend-design.md` đề xuất bỏ). Các dòng của `Dev` ở trên là
> **suy ra từ SRS mục 4**, nhóm cần xác nhận – nhất là "Request chạy lại" (gửi yêu cầu cho Admin/Tester hay tự gọi `POST /runs`? – đề xuất: cho gọi `POST /runs/:id/rerun`)
> và quyền báo lỗi. Bảng ký hiệu quyền hạn ở mục 0 cũng cần bổ sung dòng **Dev**.

## Phụ lục B – Những thứ Database cần bổ sung để làm được các endpoint trên

1. **Bảng lưu log tạm** `run_logs` (mã lần chạy, số thứ tự dòng, nội dung, thời gian) – cho khung log trực tiếp (mục 6, 8). Log bị **xóa sau khi lần chạy kết thúc**. Câu lệnh `CREATE TABLE` có sẵn ở [`backend-design.md`](./backend-design.md) mục 6.
2. **2 cột mới cho `test_runs`**: `run_name` và `config_json` (lưu `{ templateId, grep, env, timeout }`, phục vụ "Chạy lại") – xem [`backend-design.md`](./backend-design.md) mục 6.
3. **Bảng nghiệp vụ mới** `test_templates` (tên, mô tả, phạm vi, `target_json`, môi trường & timeout mặc định, người tạo) – cho mục 4. `target_json` **bắt buộc**, nếu không template lại không trỏ tới thứ gì chạy được. Câu lệnh `CREATE TABLE` ở [`backend-design.md`](./backend-design.md) mục 6.
4. ~~Bảng lưu bản nháp cấu hình test~~ – **không cần**: template chính là bản cấu hình lưu sẵn (mục 5).
5. ~~Bảng lưu mã đặt lại mật khẩu~~ – **không cần**: dùng token có hạn, không lưu trữ (xem [`backend-design.md`](./backend-design.md) mục 6).

> Tổng cộng: **1 bảng nghiệp vụ mới + 1 bảng tạm + 2 cột**.
> ⚠️ Chưa áp vào `db/schema/` – nhóm chốt thời điểm chạy migration.

## Phụ lục C – Thứ tự nên làm (nếu thiếu thời gian)

1. Mục 1 – Xác thực
2. Mục 9 (phần đọc) – `GET /cases` để có danh sách test chạy được
3. Mục 6 + 8 – Chạy test & nhận kết quả *(luồng xương sống – làm sớm, chỉ cần `POST /runs { testIds }`)*
4. Mục 7 – Xuất báo cáo
5. Mục 2 – Quản lý thành viên
6. Mục 3 – Dashboard
7. Mục 4 – Template Management
8. Các mục 🟡 Tiềm năng còn lại
