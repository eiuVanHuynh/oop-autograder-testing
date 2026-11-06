const router = require('express').Router();
const usersController = require('../controllers/users.controller');
const requireAuth = require('../middlewares/requireAuth');
const requireRole = require('../middlewares/requireRole');
const validate = require('../middlewares/validate');
const {
  userQuerySchema,
  userIdParamsSchema,
  createUserSchema,
  updateUserSchema,
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

// POST /api/users – tạo tài khoản hộ (Admin, email trùng → 409)
router.post('/', requireAuth, onlyAdmin, validate(createUserSchema), usersController.createUser);

// Thêm /users/me (api-endpoints.md mục 2, 🟡) thì phải đặt TRƯỚC ba dòng /:id dưới đây,
// nếu không 'me' rơi vào :id và chết ở validate (id phải là số) → 400 thay vì hồ sơ của mình.
// GET /api/users/:id – chi tiết một thành viên (Admin)
router.get('/:id', requireAuth, onlyAdmin, validateId, usersController.getUser);

// PATCH /api/users/:id – sửa họ tên / email (Admin)
router.patch('/:id', requireAuth, onlyAdmin, validateId, validate(updateUserSchema), usersController.updateUser);

// DELETE /api/users/:id – xóa hẳn (Admin, không tự xóa mình → 400, xóa admin → 409)
router.delete('/:id', requireAuth, onlyAdmin, validateId, usersController.deleteUser);

// PATCH /api/users/:id/role – đổi vai trò (Admin, không tự hạ quyền mình → 400)
router.patch('/:id/role', requireAuth, onlyAdmin, validateId, validate(changeRoleSchema), usersController.changeRole);

// PATCH /api/users/:id/status – khóa / mở khóa (Admin, không tự khóa mình → 400)
router.patch('/:id/status', requireAuth, onlyAdmin, validateId, validate(changeStatusSchema), usersController.changeStatus);

module.exports = router;
