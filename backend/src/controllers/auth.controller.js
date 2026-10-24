const asyncHandler = require('../utils/asyncHandler');

// Đăng nhập, đăng ký, quên mật khẩu, Google OAuth.
// Login, register, forgot password, Google OAuth.
// Controller mỏng: đọc req → gọi service → res.json({ data }). Không có quy tắc nghiệp vụ.
// Thin controller: read req → call the service → res.json({ data }). No business rules here.
//
// Cần làm / To do:
- register / login / me / logout / forgot-password / reset-password / google + callback.
// - login trả { token, user }; sai mật khẩu 401, tài khoản khóa 423, thử nhiều lần 429.
// - Trả đúng status code ghi trong api-endpoints.md mục 1.

// TODO: các hàm xử lý, bọc trong asyncHandler

module.exports = {};
