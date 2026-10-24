const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/env");
const AppError = require("../utils/AppError");

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
    this.userRepository = deps.userRepository;
  }

  async login({ email, password }) {
    const user = await this.userRepository.findByEmail(email);

    // Thông điệp giống nhau cho email sai và mật khẩu sai, tránh dò email.
    // password_hash NULL = tài khoản Google chưa đặt mật khẩu (auth_provider='GOOGLE');
    // bcrypt.compare với null sẽ throw, nên chặn trước.
    if (!user || !user.password_hash) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng');
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng');
    }

    // Kiểm tra khóa SAU khi mật khẩu đúng, để không tiết lộ trạng thái tài khoản
    // cho người đang dò mật khẩu.
    if (user.user_status !== 'active') {
      throw new AppError(423, 'ACCOUNT_LOCKED', 'Tài khoản đang bị khóa');
    }

    const token = jwt.sign(
      { user_id: user.user_id, role: user.user_role },
      JWT_SECRET,
      { expiresIn: "1d" },
    );

    // Omit password hash from returned user object
    const { password_hash, ...userWithoutPassword } = user;

    return {
      token,
      user: userWithoutPassword,
    };
  }
}

module.exports = AuthService;
