const asyncHandler = require("../utils/asyncHandler");

// Kiểm tra sức khỏe hệ thống.
// System health check.
// Controller mỏng: đọc req → gọi service → res.json({ data }). Không có quy tắc nghiệp vụ.
// Thin controller: read req → call the service → res.json({ data }). No business rules here.
//
// Cần làm / To do:
// - GET /health: 200 khi server và DB đều ổn, 503 khi không kết nối được DB.
// - Trả đúng status code ghi trong api-endpoints.md mục 11.

// TODO: các hàm xử lý, bọc trong asyncHandler

module.exports = {};
