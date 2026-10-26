const asyncHandler = require('../utils/asyncHandler');

// Báo lỗi từ một kết quả test bị Fail (🟡).
// Bug reports raised from a failed test result (🟡).
// Controller mỏng: đọc req → gọi service → res.json({ data }). Không có quy tắc nghiệp vụ.
// Thin controller: read req → call the service → res.json({ data }). No business rules here.
//
// Cần làm / To do:
// - POST /results/:id/bugs, GET /bugs có lọc, PATCH /bugs/:id.
// - Trả đúng status code ghi trong api-endpoints.md mục 10.

// TODO: các hàm xử lý, bọc trong asyncHandler

module.exports = {};
