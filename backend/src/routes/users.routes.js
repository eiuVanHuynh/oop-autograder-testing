const router = require('express').Router();

// Quản lý thành viên – chỉ Admin.
// Member management – Admin only.
// Endpoint đầy đủ: api-endpoints.md mục 2.
// Full endpoint list: api-endpoints.md section 2.
//
// Cần làm / To do:
// - Mỗi dòng theo đúng thứ tự: requireAuth → requireRole → validate → controller.
// - Route chỉ khai báo URL, không có logic.

// TODO: khai báo các route của nhóm users

module.exports = router;
