const asyncHandler = require('../utils/asyncHandler');

// Chạy test, theo dõi log, lịch sử, hủy, chạy lại.
// Running tests, log tailing, history, cancel, re-run.
// Controller mỏng: đọc req → gọi service → res.json({ data }). Không có quy tắc nghiệp vụ.
// Thin controller: read req → call the service → res.json({ data }). No business rules here.
//
// Cần làm / To do:
- POST /runs (202), GET /runs có lọc, GET /runs/:id, logs?after= và logs/stream, cancel, rerun.
// - Trả đúng status code ghi trong api-endpoints.md mục 6.

// TODO: các hàm xử lý, bọc trong asyncHandler

module.exports = {};
