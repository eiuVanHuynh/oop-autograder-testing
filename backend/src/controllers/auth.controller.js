const asyncHandler = require("../utils/asyncHandler");
// Login, register, forgot password, Google OAuth.
// Thin controller: read req → call service → res.json({ data }). No business rules.
//
// To do:
// // - register / login / me / logout / forgot-password / reset-password / google + callback.
// - login returns { token, user }; wrong password 401, locked account 423, too many attempts 429.
// - Return the status codes listed in api-endpoints.md section 1.

class AuthController {
  constructor(authService) {
    this.authService = authService;
  }

  // 1. POST /auth/register - Register a new account (Status code: 201)
  register = asyncHandler(async (req, res) => {
    const result = await this.authService.register(req.body);
    return res.status(201).json({
      data: result,
    });
  });

  // 2. POST /auth/login - Sign in (Status code: 200, 401, 423, 429)
  login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Call the service that holds the login logic
    const result = await this.authService.login({ email, password });

    // Return success with status 200 per the shared convention
    return res.status(200).json({
      data: result,
    });
  });

  // 3. GET /auth/me - Current user from the token (Status code: 200, 401)
  me = asyncHandler(async (req, res) => {
    // req.user is set by the requireAuth middleware
    const userId = req.user.user_id;
    const result = await this.authService.getCurrentUser(userId);
    return res.status(200).json({
      data: result,
    });
  });

  // 4. POST /auth/logout - Sign out / invalidate the token (Status code: 204, 401)[cite: 1]
  logout = asyncHandler(async (req, res) => {
    await this.authService.logout(req.user);
    // 204 No Content: succeeded, but there is no data to return[cite: 1]
    return res.status(204).send();
  });

  // 5. POST /auth/forgot-password - Forgot password (Status code: 200, 400, 429)[cite: 1]
  forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    await this.authService.forgotPassword(email);
    return res.status(200).json({
      data: { message: "If the email exists, a reset link has been sent." },
    });
  });

  // 6. POST /auth/reset-password - Set a new password (Status code: 200, 400, 410)[cite: 1]
  resetPassword = asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;
    await this.authService.resetPassword({ token, newPassword });
    return res.status(200).json({
      data: { message: "Password has been successfully reset." },
    });
  });

  // 7. GET /auth/google - Redirect to the Google OAuth page (Status code: 302)[cite: 1]
  google = asyncHandler(async (req, res) => {
    const googleAuthUrl = await this.authService.getGoogleAuthUrl();
    return res.redirect(302, googleAuthUrl);
  });

  // 8. GET /auth/google/callback - Receive the result from Google (Status code: 302, 401)[cite: 1]
  googleCallback = asyncHandler(async (req, res) => {
    const { code } = req.query;
    const redirectUrl = await this.authService.handleGoogleCallback(code);
    return res.redirect(302, redirectUrl);
  });
}

module.exports = AuthController;
