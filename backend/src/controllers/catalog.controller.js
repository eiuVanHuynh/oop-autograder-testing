const asyncHandler = require("../utils/asyncHandler");

// Suite / spec / case – nơi khai báo test, nguồn để chọn target.
// Suites / specs / cases – where tests are declared, the source for picking targets.
// Controller mỏng: đọc req → gọi service → res.json({ data }). Không có quy tắc nghiệp vụ.
// Thin controller: read req → call the service → res.json({ data }). No business rules here.
//
// Cần làm / To do:
// - GET /suites, /suites/:id/specs, /cases có lọc, /cases/:id. Phần ghi là 🟡, làm sau.
// - Trả đúng status code ghi trong api-endpoints.md mục 9.

// TODO: các hàm xử lý, bọc trong asyncHandler

module.exports = {};
