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

class AuthController {
  constructor(authService) {
    this.authService = authService;
  }

  // 1. POST /auth/register - Đăng ký tài khoản mới (Status code: 201)
  register = asyncHandler(async (req, res) => {
    const result = await this.authService.register(req.body);
    return res.status(201).json({
      data: result,
    });
  });

  // 2. POST /auth/login - Đăng nhập (Status code: 200, 401, 423, 429)
  login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Gọi service xử lý logic đăng nhập
    const result = await this.authService.login({ email, password });

    // Trả về kết quả thành công với status 200 theo chuẩn quy ước
    return res.status(200).json({
      data: result,
    });
  });

  // 3. GET /auth/me - Lấy thông tin user hiện tại qua token (Status code: 200, 401)
  me = asyncHandler(async (req, res) => {
    // req.user được gán từ requireAuth middleware
    const userId = req.user.id;
    const result = await this.authService.getCurrentUser(userId);
    return res.status(200).json({
      data: result,
    });
  });

  // 4. POST /auth/logout - Đăng xuất / Hủy token (Status code: 204, 401)[cite: 1]
  logout = asyncHandler(async (req, res) => {
    await this.authService.logout(req.user);
    // 204 No Content: thành công nhưng không cần trả dữ liệu[cite: 1]
    return res.status(204).send();
  });

  // 5. POST /auth/forgot-password - Quên mật khẩu (Status code: 200, 400, 429)[cite: 1]
  forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    await this.authService.forgotPassword(email);
    return res.status(200).json({
      data: { message: "If the email exists, a reset link has been sent." },
    });
  });

  // 6. POST /auth/reset-password - Đặt lại mật khẩu mới (Status code: 200, 400, 410)[cite: 1]
  resetPassword = asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;
    await this.authService.resetPassword({ token, newPassword });
    return res.status(200).json({
      data: { message: "Password has been successfully reset." },
    });
  });

  // 7. GET /auth/google - Chuyển hướng sang trang Google OAuth (Status code: 302)[cite: 1]
  google = asyncHandler(async (req, res) => {
    const googleAuthUrl = await this.authService.getGoogleAuthUrl();
    return res.redirect(302, googleAuthUrl);
  });

  // 8. GET /auth/google/callback - Nhận kết quả trả về từ Google (Status code: 302, 401)[cite: 1]
  googleCallback = asyncHandler(async (req, res) => {
    const { code } = req.query;
    const redirectUrl = await this.authService.handleGoogleCallback(code);
    return res.redirect(302, redirectUrl);
  });
}

module.exports = AuthController;
