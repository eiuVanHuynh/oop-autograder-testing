const router = require('express').Router();
const bugsController = require('../controllers/bugs.controller');
const requireAuth = require('../middlewares/requireAuth');
const requireRole = require('../middlewares/requireRole');
const validate = require('../middlewares/validate');
const {
  createBugSchema,
  updateBugSchema,
  bugQuerySchema,
  idParamsSchema,
} = require('../validators/bugs.schema');

// Báo lỗi từ một kết quả test bị Fail (🟡).
// Bug reports raised from a failed test result (🟡).
// Endpoint đầy đủ: api-endpoints.md mục 10. POST /results/:id/bugs KHÔNG nằm dưới /bugs,
// nên nhóm này mount ở gốc và khai đường dẫn đầy đủ (xem ghi chú routes/index.js).
//
// Mỗi dòng theo đúng thứ tự: requireAuth → requireRole → validate → controller.
const canReport = requireRole('admin', 'tester', 'dev'); // Phụ lục A: Dev được báo lỗi
const validateId = validate(idParamsSchema, 'params');

// POST /api/results/:id/bugs – tạo báo cáo lỗi từ một kết quả Fail (409 nếu kết quả đã Đạt)
router.post('/results/:id/bugs', requireAuth, canReport, validateId, validate(createBugSchema), bugsController.createBug);

// GET /api/bugs?status=&severity= – danh sách lỗi (mọi user đăng nhập)
router.get('/bugs', requireAuth, validate(bugQuerySchema, 'query'), bugsController.getBugs);

// PATCH /api/bugs/:id – cập nhật lỗi, thường là đổi trạng thái (Admin, Tester)
router.patch('/bugs/:id', requireAuth, requireRole('admin', 'tester'), validateId, validate(updateBugSchema), bugsController.updateBug);

module.exports = router;
