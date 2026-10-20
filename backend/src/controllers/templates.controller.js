const asyncHandler = require('../utils/asyncHandler');

// Template – thứ người dùng chọn để chạy (bảng mới test_templates).
// Templates – what the user picks to run (the new test_templates table).
// Controller mỏng: đọc req → gọi service → res.json({ data }). Không có quy tắc nghiệp vụ.
// Thin controller: read req → call the service → res.json({ data }). No business rules here.
//
// Cần làm / To do:
- CRUD + duplicate. Viewer chỉ được GET.
// - Trả đúng status code ghi trong api-endpoints.md mục 4.

// TODO: các hàm xử lý, bọc trong asyncHandler

module.exports = {};
