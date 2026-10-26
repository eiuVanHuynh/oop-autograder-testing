const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/env");

// Đăng nhập, đăng ký, quên mật khẩu, Google OAuth.
// Login, register, forgot password, Google OAuth.
// Quy tắc nghiệp vụ nằm ở đây. Không require pg, không chạm req/res.
// Business rules live here. Never require pg, never touch req/res.
// Nhận repository qua constructor để test thay được bằng bản giả.
// Takes its repositories through the constructor so tests can pass fakes.
class AuthService {
  constructor(deps = {}) {
    // Hỗ trợ cả truyền trực tiếp repository hoặc truyền dạng object { userRepository }
    this.userRepository = deps.findByEmail ? deps : deps.userRepository || deps;
  }

  // 1. Đăng ký tài khoản mới (Tài khoản mới luôn là viewer)[cite: 1]
  async register({ fullName, email, password }) {
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      const error = new Error("Email already exists");
      error.statusCode = 409;
      error.code = "EMAIL_TAKEN";
      throw error;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Tạo user mới với quyền mặc định là 'viewer'[cite: 1]
    const newUser = await this.userRepository.create({
      full_name: fullName,
      email,
      password_hash: passwordHash,
      user_role: "viewer",
      status: "active",
    });

    const token = jwt.sign(
      {
        id: newUser.id || newUser.user_id,
        role: newUser.user_role || newUser.role,
      },
      JWT_SECRET,
      { expiresIn: "1d" },
    );

    const { password_hash, password: _, ...userWithoutPassword } = newUser;
    return {
      token,
      user: userWithoutPassword,
    };
  }

  // 2. Đăng nhập hệ thống
  async login({ email, password }) {
    // Find user by email
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      const error = new Error("Invalid email or password");
      error.statusCode = 401;
      error.code = "UNAUTHORIZED";
      throw error;
    }

    // Kiểm tra nếu tài khoản đang bị khóa -> trả về 423 theo api-endpoints.md mục 0 & 1[cite: 1]
    if (
      user.status === "locked" ||
      user.is_locked ||
      user.status === "suspended"
    ) {
      const error = new Error("User account is locked");
      error.statusCode = 423;
      error.code = "ACCOUNT_LOCKED";
      throw error;
    }

    // Compare password with bcrypt
    const isMatch = await bcrypt.compare(
      password,
      user.password_hash || user.password,
    );
    if (!isMatch) {
      const error = new Error("Invalid email or password");
      error.statusCode = 401;
      error.code = "UNAUTHORIZED";
      throw error;
    }

    // Sign JWT token
    const token = jwt.sign(
      { id: user.id || user.user_id, role: user.role || user.user_role },
      JWT_SECRET,
      { expiresIn: "1d" },
    );

    // Omit password hash from returned user object
    const { password_hash, password: _, ...userWithoutPassword } = user;

    return {
      token,
      user: userWithoutPassword,
    };
  }

  // 3. Lấy thông tin user hiện tại (GET /auth/me)[cite: 1]
  async getCurrentUser(userId) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      error.code = "NOT_FOUND";
      throw error;
    }
    const { password_hash, password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // 4. Quên mật khẩu (Luôn trả 200 kể cả email không tồn tại để tránh dò email)[cite: 1]
  async forgotPassword(email) {
    const user = await this.userRepository.findByEmail(email);
    if (user) {
      // Token đặt lại mật khẩu KHÔNG lưu DB: JWT 15 phút ký kèm một phần password_hash hiện tại[cite: 2]
      const hashSnippet = user.password_hash.substring(0, 10);
      const resetToken = jwt.sign(
        { id: user.id || user.user_id, snippet: hashSnippet },
        JWT_SECRET,
        { expiresIn: "15m" },
      );
      // Ghi chú: Tại đây tích hợp service gửi email thực tế chứa resetToken
      console.log(`Reset password link for ${email}: token=${resetToken}`);
    }
    return { message: "If the email exists, a reset link has been sent." };
  }

  // 5. Đặt lại mật khẩu mới[cite: 1]
  async resetPassword({ token, newPassword }) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await this.userRepository.findById(decoded.id);

      if (!user) {
        const error = new Error("Link is invalid or expired");
        error.statusCode = 410;
        error.code = "GONE";
        throw error;
      }

      // Xác thực snippet của password_hash để token tự vô hiệu hóa sau khi đổi mật khẩu[cite: 2]
      const hashSnippet = user.password_hash.substring(0, 10);
      if (decoded.snippet !== hashSnippet) {
        const error = new Error("Link has already been used or is expired");
        error.statusCode = 410;
        error.code = "GONE";
        throw error;
      }

      const newPasswordHash = await bcrypt.hash(newPassword, 10);
      await this.userRepository.updatePassword(
        user.id || user.user_id,
        newPasswordHash,
      );

      return { message: "Password has been successfully reset." };
    } catch (err) {
      const error = new Error("Token is invalid or expired");
      error.statusCode = 410;
      error.code = "GONE";
      throw error;
    }
  }
}

module.exports = AuthService;
