const asyncHandler = require('../utils/asyncHandler');

// Xuất báo cáo PDF/HTML và link chia sẻ.
// PDF/HTML report export and share links.
// Controller mỏng: đọc req → gọi service → res.json({ data }). Không có quy tắc nghiệp vụ.
// Thin controller: read req → call the service → res.json({ data }). No business rules here.
//
// Cần làm / To do:
- GET /runs/:id/export?format=, POST /runs/export (nhiều run → .zip), share + GET /share/:token.
// - Trả đúng status code ghi trong api-endpoints.md mục 7.

// TODO: các hàm xử lý, bọc trong asyncHandler

module.exports = {};
