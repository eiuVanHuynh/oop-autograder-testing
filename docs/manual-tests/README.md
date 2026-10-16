# Biên bản kiểm thử thủ công (X3)

Môi trường: https://oop-autograder-test.vercel.app/
Các TC này chưa tự động hóa được bằng Playwright. Mỗi TC có một file `TC-xx.md`; ảnh chụp để trong `evidence/`, đặt tên `TC-xx_buoc<N>.png`.

| TC | Lý do chưa tự động | Cần có để làm | Trạng thái |
|---|---|---|---|
| TC-03 | Google OAuth, không có test hook | Email trường `@eiu.edu.vn` đã đăng nhập web (chạy sau TC-05) | Chưa làm |
| TC-04 | Google OAuth, không có test hook | 1 Gmail ngoài trường | Chưa làm |
| TC-05 | Cần đăng nhập Google lần đầu | Email trường `@eiu.edu.vn` **chưa từng** đăng nhập web | Chưa làm |
| TC-07 | Cần link reset trong email | Chức năng gửi email reset | **Blocked**: giảng viên báo email reset đang lỗi |

**Thứ tự nên làm: TC-04 → TC-05 → TC-03.** TC-05 tạo hồ sơ cho email trường, sau đó chính tài khoản đó dùng được cho TC-03.
Làm xong thì xóa user (Users → thùng rác) để lần sau còn là "lần đầu".

Điền cột Trạng thái: `Pass` / `Fail` / `Blocked: <lý do>`.
X3 xong khi mỗi TC có biên bản có kết quả hoặc ghi rõ lý do chưa test được.
Dữ liệu tạo ra khi test theo `docs/test-data-rules.md` và được dọn theo mục 5 của file đó.
