const router = require('express').Router();
const usersController = require('../controllers/users.controller');
const requireAuth = require('../middlewares/requireAuth');
const requireRole = require('../middlewares/requireRole');
const validate = require('../middlewares/validate');
const {
  userQuerySchema,
  userIdParamsSchema,
  changeRoleSchema,
  changeStatusSchema,
} = require('../validators/users.schema');

// Quản lý thành viên – chỉ Admin.
// Member management – Admin only.
// Endpoint đầy đủ: api-endpoints.md mục 2.
//
// Mỗi dòng theo đúng thứ tự: requireAuth → requireRole → validate → controller.
const onlyAdmin = requireRole('admin');
const validateId = validate(userIdParamsSchema, 'params');

// GET /api/users?q=&role=&status=&page=&limit= – danh sách thành viên (Admin)
router.get('/', requireAuth, onlyAdmin, validate(userQuerySchema, 'query'), usersController.getUsers);

// PATCH /api/users/:id/role – đổi vai trò (Admin, không tự hạ quyền mình → 400)
router.patch('/:id/role', requireAuth, onlyAdmin, validateId, validate(changeRoleSchema), usersController.changeRole);

// PATCH /api/users/:id/status – khóa / mở khóa (Admin, không tự khóa mình → 400)
router.patch('/:id/status', requireAuth, onlyAdmin, validateId, validate(changeStatusSchema), usersController.changeStatus);

module.exports = router;
