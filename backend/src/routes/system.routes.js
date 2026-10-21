const router = require('express').Router();

// Kiểm tra sức khỏe hệ thống.
// System health check.
// Endpoint đầy đủ: api-endpoints.md mục 11.
// Full endpoint list: api-endpoints.md section 11.
//
// Cần làm / To do:
// - Mỗi dòng theo đúng thứ tự: requireAuth → requireRole → validate → controller.
// - Route chỉ khai báo URL, không có logic.

// TODO: khai báo các route của nhóm system

module.exports = router;
