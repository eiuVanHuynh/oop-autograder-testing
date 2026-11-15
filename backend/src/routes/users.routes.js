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

// Member management – Admin only.
// Full endpoint list: api-endpoints.md section 2.
//
// Every line in this order: requireAuth → requireRole → validate → controller.
const onlyAdmin = requireRole('admin');
const validateId = validate(userIdParamsSchema, 'params');

// GET /api/users?q=&role=&status=&page=&limit= – member list (Admin)
router.get('/', requireAuth, onlyAdmin, validate(userQuerySchema, 'query'), usersController.getUsers);

// POST /api/users – create an account on someone's behalf (Admin, duplicate email → 409)
router.post('/', requireAuth, onlyAdmin, validate(createUserSchema), usersController.createUser);

// Adding /users/me (api-endpoints.md section 2, 🟡) must go BEFORE the three /:id lines below,
// otherwise 'me' falls into :id and dies in validate (id must be numeric) → 400 instead of your own profile.
// GET /api/users/:id – one member's details (Admin)
router.get('/:id', requireAuth, onlyAdmin, validateId, usersController.getUser);

// PATCH /api/users/:id – edit full name / email (Admin)
router.patch('/:id', requireAuth, onlyAdmin, validateId, validate(updateUserSchema), usersController.updateUser);

// DELETE /api/users/:id – hard delete (Admin, cannot delete yourself → 400, deleting an admin → 409)
router.delete('/:id', requireAuth, onlyAdmin, validateId, usersController.deleteUser);

// PATCH /api/users/:id/role – change role (Admin, cannot demote yourself → 400)
router.patch('/:id/role', requireAuth, onlyAdmin, validateId, validate(changeRoleSchema), usersController.changeRole);

// PATCH /api/users/:id/status – lock / unlock (Admin, cannot lock yourself → 400)
router.patch('/:id/status', requireAuth, onlyAdmin, validateId, validate(changeStatusSchema), usersController.changeStatus);

module.exports = router;
