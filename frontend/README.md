# `frontend/` – Dashboard quản lý test

Giao diện React + Vite + Tailwind cho nền tảng test automation trong repo này.
Yêu cầu giao diện: [`docs/frontend/03-yeu-cau-giao-dien-v3.md`](../docs/frontend/03-yeu-cau-giao-dien-v3.md) (bản được ưu tiên).

## Chạy

```bash
npm install
npm run dev      # Vite dev server
npm run lint     # oxlint
npm run check    # self-check cho src/models/ (chạy bằng node:assert, không cần cài gì thêm)
npm run build
```

Backend API mặc định là `http://localhost:5000/api`; đổi bằng biến `VITE_API_URL`.

## Cấu trúc

| Thư mục | Nội dung |
| --- | --- |
| `src/views/` | Một file cho mỗi màn hình (Login, Dashboard, TestCreation, History, …) |
| `src/components/layout/` | `Sidebar`, `TopBar` và `MainLayout` / `AuthLayout` |
| `src/components/ui/` | Component dùng lại: `Button`, `Panel`, `FormField`, `FilterBar`, … |
| `src/models/` | Logic thuần, không JSX: `api.js`, `permissions.js`, `testSteps.js`, `runLog.js`, `reportHtml.js` |
| `src/services/` | Gọi API và map dữ liệu backend → shape của frontend |
| `src/controllers/` | `AuthContext` – phiên đăng nhập và `useAuth()` |
| `checks/` | Self-check cho 3 file `models/` giữ hợp đồng với backend |

## Lưu ý

- Ba file `src/models/testSteps.js`, `runLog.js`, `reportHtml.js` giữ **hợp đồng với backend**: sai thì build vẫn xanh mà giao diện hỏng âm thầm. Sửa một trong ba, hoặc sửa câu log bên backend → chạy lại `npm run check`.
- Hằng số trạng thái: frontend dùng chữ HOA (`PASSED`), DB dùng chữ thường (`passed`). Chuyển đổi **chỉ ở một chỗ**: `backend/src/utils/mappers.js`.
- Ẩn nút là chưa đủ: mọi hạn chế quyền trên giao diện phải có 403 tương ứng ở backend.
