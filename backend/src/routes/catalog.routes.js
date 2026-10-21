const router = require('express').Router();

// Suite / spec / case – nơi khai báo test, nguồn để chọn target.
// Suites / specs / cases – where tests are declared, the source for picking targets.
// Endpoint đầy đủ: api-endpoints.md mục 9.
// Full endpoint list: api-endpoints.md section 9.
//
// Cần làm / To do:
// - Mỗi dòng theo đúng thứ tự: requireAuth → requireRole → validate → controller.
// - Route chỉ khai báo URL, không có logic.

// TODO: khai báo các route của nhóm catalog

module.exports = router;
