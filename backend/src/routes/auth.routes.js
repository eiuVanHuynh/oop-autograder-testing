const router = require("express").Router();
const AuthController = require("../controllers/auth.controller");
const AuthService = require("../services/auth.service");
const UserRepository = require("../repositories/UserRepository");

// Khởi tạo trực tiếp instance để route có thể gọi hàm login
const authService = new AuthService(UserRepository);
const authController = new AuthController(authService);

const {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
} = require("../validators/auth.schema");
const requireAuth = require("../middlewares/requireAuth");

// Đăng nhập, đăng ký, quên mật khẩu, Google OAuth.
// Login, register, forgot password, Google OAuth.
// Endpoint đầy đủ: api-endpoints.md mục 1.
// Full endpoint list: api-endpoints.md section 1.
//
// Cần làm / To do:
// - Mỗi dòng theo đúng thứ tự: requireAuth → requireRole → validate → controller.
// - Route chỉ khai báo URL, không có logic.

// TODO: khai báo các route của nhóm auth
router.post("/login", validateLogin, authController.login);

module.exports = router;
