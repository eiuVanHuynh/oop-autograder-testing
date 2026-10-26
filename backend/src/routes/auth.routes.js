const router = require("express").Router();
const { authController } = require("../config/container");

const { loginSchema } = require("../validators/auth.schema");
const validate = require("../middlewares/validate");

// Đăng nhập, đăng ký, quên mật khẩu, Google OAuth.
// Login, register, forgot password, Google OAuth.
// Endpoint đầy đủ: api-endpoints.md mục 1.
// Full endpoint list: api-endpoints.md section 1.
//
// Cần làm / To do:
// - Mỗi dòng theo đúng thứ tự: requireAuth → requireRole → validate → controller.
// - Route chỉ khai báo URL, không có logic.
// - Còn thiếu: register / me / logout / forgot-password / reset-password / google.
//   Schema của register/forgot/reset đã có sẵn trong validators/auth.schema.js.
//   Hiện tài khoản được tạo trực tiếp trong DB (db/migrations/007_seed_users.sql).

router.post("/login", validate(loginSchema), authController.login);

module.exports = router;
