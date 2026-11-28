const router = require("express").Router();
const { authController } = require("../config/container");

const { loginSchema, registerSchema } = require("../validators/auth.schema");
const validate = require("../middlewares/validate");
const requireAuth = require("../middlewares/requireAuth");

// Login, register, forgot password, Google OAuth.
// Full endpoint list: api-endpoints.md section 1.
//
// To do:
// - Every line in this order: requireAuth → requireRole → validate → controller.
// - A route only declares the URL, it holds no logic.
// - Still missing: logout / forgot-password / reset-password / google.
//   The forgot/reset schemas already exist in validators/auth.schema.js, but authService.forgotPassword
//   has no email service yet (see the warning box in services/auth.service.js), and
//   authController.logout/google/googleCallback call service methods that do not exist yet.

// shortcut: register has no rate limiting, so api-endpoints.md's 429 never happens — add one
// (express-rate-limit) before this is exposed outside the campus network.
router.post("/register", validate(registerSchema), authController.register);

router.post("/login", validate(loginSchema), authController.login);

// Service and controller were both already written; only this line was missing. The frontend can now
// verify a stored token instead of trusting whatever user object sits in localStorage.
router.get("/me", requireAuth, authController.me);

module.exports = router;
