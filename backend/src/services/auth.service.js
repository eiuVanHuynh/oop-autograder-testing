const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/env");

// Đăng nhập, đăng ký, quên mật khẩu, Google OAuth.
// Login, register, forgot password, Google OAuth.
// Quy tắc nghiệp vụ nằm ở đây. Không require pg, không chạm req/res.
// Business rules live here. Never require pg, never touch req/res.
// Nhận repository qua constructor để test thay được bằng bản giả.
// Takes its repositories through the constructor so tests can pass fakes.
//
// Cần làm / To do:
// - Băm mật khẩu bằng bcrypt, ký JWT. Tài khoản mới LUÔN là viewer.
// - Token đặt lại mật khẩu KHÔNG lưu DB: JWT 15 phút ký kèm một phần password_hash hiện tại.
// - forgot-password luôn trả 200 kể cả email không tồn tại, tránh dò email.
class AuthService {
  constructor(deps = {}) {
    // TODO: nhận repository cần dùng từ config/container.js
    // Hỗ trợ cả truyền trực tiếp repository hoặc truyền dạng object { userRepository }
    this.userRepository = deps.findByEmail ? deps : deps.userRepository || deps;
  }

  // TODO
  async login({ email, password }) {
    // Find user by email
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      const error = new Error("Invalid email or password");
      error.statusCode = 401;
      throw error;
    }

    // Compare password with bcrypt
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      const error = new Error("Invalid email or password");
      error.statusCode = 401;
      throw error;
    }

    // Sign JWT token
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
      expiresIn: "1d",
    });

    // Omit password hash from returned user object
    const { password_hash, ...userWithoutPassword } = user;

    return {
      token,
      user: userWithoutPassword,
    };
  }
}

module.exports = AuthService;
