const router = require('express').Router();

// Cửa sau cho máy: Playwright đẩy kết quả và log về.
// Machine-only door: Playwright pushes results and logs back.
// Endpoint đầy đủ: api-endpoints.md mục 8.
// Full endpoint list: api-endpoints.md section 8.
//
// Cần làm / To do:
// - Mỗi dòng theo đúng thứ tự: requireAuth → requireRole → validate → controller.
// - Route chỉ khai báo URL, không có logic.

// TODO: khai báo các route của nhóm ingest

module.exports = router;
