const asyncHandler = require("../utils/asyncHandler");
const { usersService } = require("../config/container");

// Member management – Admin only.
// Thin controller: read req → call service → res.json({ data }). No business rules.

// 1. GET /users?q=&role=&status=&page=&limit= (200)
const getUsers = asyncHandler(async (req, res) => {
  const result = await usersService.getUsers(req.query);
  return res.status(200).json(result); // { data, meta }
});

// 2. GET /users/:id (200)
const getUser = asyncHandler(async (req, res) => {
  return res.status(200).json({ data: await usersService.getUser(req.params.id) });
});

// 3. POST /users (201)
const createUser = asyncHandler(async (req, res) => {
  return res.status(201).json({ data: await usersService.createUser(req.body) });
});

// 4. PATCH /users/:id (200)
const updateUser = asyncHandler(async (req, res) => {
  return res.status(200).json({ data: await usersService.updateUser(req.params.id, req.body) });
});

// 5. DELETE /users/:id (204)
const deleteUser = asyncHandler(async (req, res) => {
  await usersService.deleteUser(req.params.id, req.user.user_id);
  return res.status(204).end();
});

// 6. PATCH /users/me/password (204) — tự đổi mật khẩu
const changeOwnPassword = asyncHandler(async (req, res) => {
  await usersService.changeOwnPassword(req.user.user_id, req.body);
  return res.status(204).end();
});

// 7. PATCH /users/:id/password (204) — admin đặt lại mật khẩu cho người quên
const resetUserPassword = asyncHandler(async (req, res) => {
  await usersService.resetUserPassword(req.params.id, req.body.newPassword, req.user.user_id);
  return res.status(204).end();
});

// 8. PATCH /users/:id/role (200)
const changeRole = asyncHandler(async (req, res) => {
  const user = await usersService.changeRole(
    req.params.id,
    req.body.role,
    req.user.user_id,
  );
  return res.status(200).json({ data: user });
});

// 9. PATCH /users/:id/status (200)
const changeStatus = asyncHandler(async (req, res) => {
  const user = await usersService.changeStatus(
    req.params.id,
    req.body.status,
    req.user.user_id,
  );
  return res.status(200).json({ data: user });
});

module.exports = {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  changeOwnPassword,
  resetUserPassword,
  changeRole,
  changeStatus,
};
