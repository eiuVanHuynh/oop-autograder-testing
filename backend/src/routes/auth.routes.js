const router = require("express").Router();
const { authController } = require("../config/container");

const { loginSchema } = require("../validators/auth.schema");
const validate = require("../middlewares/validate");

// Login, register, forgot password, Google OAuth.
// Full endpoint list: api-endpoints.md section 1.
//
// To do:
// - Every line in this order: requireAuth → requireRole → validate → controller.
// - A route only declares the URL, it holds no logic.
// - Still missing: register / me / logout / forgot-password / reset-password / google.
//   The register/forgot/reset schemas already exist in validators/auth.schema.js.
//   For now accounts are created straight in the DB (db/migrations/007_seed_users.sql).

router.post("/login", validate(loginSchema), authController.login);

module.exports = router;
