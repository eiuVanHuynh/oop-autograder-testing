const asyncHandler = require("../utils/asyncHandler");
const { usersService } = require("../config/container");

// Quản lý thành viên – chỉ Admin.
// Controller mỏng: đọc req → gọi service → res.json({ data }). Không có quy tắc nghiệp vụ.

// 1. GET /users?q=&role=&status=&page=&limit= (200)
const getUsers = asyncHandler(async (req, res) => {
  const result = await usersService.getUsers(req.query);
  return res.status(200).json(result); // { data, meta }
});

// 2. PATCH /users/:id/role (200)
const changeRole = asyncHandler(async (req, res) => {
  const user = await usersService.changeRole(
    req.params.id,
    req.body.role,
    req.user.user_id,
  );
  return res.status(200).json({ data: user });
});

// 3. PATCH /users/:id/status (200)
const changeStatus = asyncHandler(async (req, res) => {
  const user = await usersService.changeStatus(
    req.params.id,
    req.body.status,
    req.user.user_id,
  );
  return res.status(200).json({ data: user });
});

module.exports = { getUsers, changeRole, changeStatus };
