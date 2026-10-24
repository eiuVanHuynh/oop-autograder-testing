const asyncHandler = require('../utils/asyncHandler');

// Cửa sau cho máy: Playwright đẩy kết quả và log về.
// Machine-only door: Playwright pushes results and logs back.
// Controller mỏng: đọc req → gọi service → res.json({ data }). Không có quy tắc nghiệp vụ.
// Thin controller: read req → call the service → res.json({ data }). No business rules here.
//
// Cần làm / To do:
// - POST /ingest/runs, /runs/:id/results, /runs/:id/logs, PATCH /runs/:id/finish, results/:id/evidences.
// - Nhóm này dùng requireApiKey, KHÔNG dùng requireAuth.
// - Trả đúng status code ghi trong api-endpoints.md mục 8.

// TODO: các hàm xử lý, bọc trong asyncHandler

module.exports = {};
