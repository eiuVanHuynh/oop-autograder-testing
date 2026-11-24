const router = require("express").Router();
const { authController } = require("../config/container");

const { loginSchema, registerSchema } = require("../validators/auth.schema");
const validate = require("../middlewares/validate");

// Login, register, forgot password, Google OAuth.
// Full endpoint list: api-endpoints.md section 1.
//
// To do:
// - Every line in this order: requireAuth → requireRole → validate → controller.
// - A route only declares the URL, it holds no logic.
// - Still missing: me / logout / forgot-password / reset-password / google.
//   The forgot/reset schemas already exist in validators/auth.schema.js.

// shortcut: register has no rate limiting, so api-endpoints.md's 429 never happens — add one
// (express-rate-limit) before this is exposed outside the campus network.
router.post("/register", validate(registerSchema), authController.register);

router.post("/login", validate(loginSchema), authController.login);

module.exports = router;
