const router = require('express').Router();

// Chạy test, theo dõi log, lịch sử, hủy, chạy lại.
// Running tests, log tailing, history, cancel, re-run.
// Endpoint đầy đủ: api-endpoints.md mục 6.
// Full endpoint list: api-endpoints.md section 6.
//
// Cần làm / To do:
// - Mỗi dòng theo đúng thứ tự: requireAuth → requireRole → validate → controller.
// - Route chỉ khai báo URL, không có logic.

// TODO: khai báo các route của nhóm runs

module.exports = router;
