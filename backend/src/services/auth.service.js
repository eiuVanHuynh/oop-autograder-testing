// Đăng nhập, đăng ký, quên mật khẩu, Google OAuth.
// Login, register, forgot password, Google OAuth.
// Quy tắc nghiệp vụ nằm ở đây. Không require pg, không chạm req/res.
// Business rules live here. Never require pg, never touch req/res.
// Nhận repository qua constructor để test thay được bằng bản giả.
// Takes its repositories through the constructor so tests can pass fakes.
//
// Cần làm / To do:
- Băm mật khẩu bằng bcrypt, ký JWT. Tài khoản mới LUÔN là viewer.
// - Token đặt lại mật khẩu KHÔNG lưu DB: JWT 15 phút ký kèm một phần password_hash hiện tại.
// - forgot-password luôn trả 200 kể cả email không tồn tại, tránh dò email.
class AuthService {
  constructor(deps = {}) {
    // TODO: nhận repository cần dùng từ config/container.js
  }

  // TODO
}

module.exports = AuthService;
