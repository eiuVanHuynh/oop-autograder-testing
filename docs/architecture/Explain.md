# Explain – `docs/architecture/`

**Nội dung:** đặc tả yêu cầu và các sơ đồ kiến trúc của **nền tảng test automation trong repo này**.

> ⚠️ Không nhầm với yêu cầu chức năng của hệ thống *cần kiểm thử* (website OOP AutoGrader) – nằm ở [`../testing/`](../testing/).

📌 **[`SRS.md`](./SRS.md) là nguồn chuẩn** về kiến trúc, yêu cầu chức năng, công nghệ và vai trò người dùng.
Tài liệu khác và code hiện tại phải theo nó; chỗ nào lệch là việc còn phải làm.
Nguồn chuẩn về cấu trúc DB là `db/schema/test_automation_db_schema.sql`.
Cả hai vẫn sẽ được sửa về sau – khi nhóm chốt lại thì **quyết định mới của nhóm được ưu tiên**, sửa nguồn chuẩn trước.

## File trong thư mục

| File | Là gì | Ghi chú |
| --- | --- | --- |
| [`SRS.md`](./SRS.md) | Đặc tả yêu cầu sản phẩm (song ngữ Việt – Anh). Kiến trúc MVC, phạm vi MVP, vai trò, 9 nhóm yêu cầu chức năng, chính sách lưu trữ dữ liệu. | Có **Ghi chú biên tập** ở đầu liệt kê các chỗ chưa khớp code. |
| [`kien-truc-va-luong-du-lieu.md`](./kien-truc-va-luong-du-lieu.md) | Mô tả bằng chữ của cả 3 sơ đồ + **bảng đối chiếu nguồn chuẩn ↔ code** (mục 4) | **Đọc file này trước**, đọc được ngay trên GitHub |
| `context-and-sequence-diagram.html` | File draw.io xuất ra HTML, 2 trang: Context Diagram và Sequence Diagram | Mở bằng trình duyệt (cần mạng để tải viewer của diagrams.net) |
| `data-flow-capstone.drawio` | DFD Level 0 | Mở bằng [app.diagrams.net](https://app.diagrams.net) hoặc extension Draw.io trong VS Code |
| `diagram.mmd` | Nguồn Mermaid của sơ đồ kiến trúc | Sửa bằng text, xem trước ở [mermaid.live](https://mermaid.live) |
| `floorplan-map.html` | **Bản đồ code tương tác**: mọi file và mọi endpoint có tên + một dòng mô tả tiếng Việt | Mở bằng trình duyệt, không cần cài gì. File sinh ra tự động – đừng sửa tay, xem `README.md` mục "Architecture map" |
| 7 sơ đồ trong [`../diagrams/`](../diagrams/) | Activity, architecture, class, dataflow, sequence, structure, tree (HTML tự chứa + `.delivery.json`) | Khi cần hình cho báo cáo |

## Đọc theo thứ tự nào

1. `kien-truc-va-luong-du-lieu.md` – nắm tổng thể trong 5 phút.
2. `SRS.md` – khi cần chi tiết một yêu cầu chức năng cụ thể.
3. File sơ đồ gốc – khi cần sửa sơ đồ.

## Quy tắc bảo trì

- **Sơ đồ là nguồn chuẩn về hình ảnh, Markdown là nguồn chuẩn về chữ.** Sửa sơ đồ xong phải cập nhật mục tương ứng trong `kien-truc-va-luong-du-lieu.md`.
- Mục 4 của `kien-truc-va-luong-du-lieu.md` liệt kê 6 điểm sơ đồ/SRS đang lệch với code. Khi nhóm chốt được điểm nào thì **sửa sơ đồ + SRS + xóa dòng đó khỏi bảng**, đừng để tồn đọng.
- Khi xuất lại file từ draw.io, đặt đúng tên cũ (`context-and-sequence-diagram.html`, `data-flow-capstone.drawio`) để các link không hỏng.
