const asyncHandler = require('../utils/asyncHandler');

// Số liệu cho Dashboard.
// Numbers for the Dashboard.
// Controller mỏng: đọc req → gọi service → res.json({ data }). Không có quy tắc nghiệp vụ.
// Thin controller: read req → call the service → res.json({ data }). No business rules here.
//
// Cần làm / To do:
- GET /stats/summary và /stats/daily?days=7. days không hợp lệ → 400.
// - Trả đúng status code ghi trong api-endpoints.md mục 3.

// TODO: các hàm xử lý, bọc trong asyncHandler

module.exports = {};
