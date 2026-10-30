const { z } = require("zod");

// Schema zod cho nhóm auth; middleware validate() dùng các schema này.
// zod schemas for the auth group; the validate() middleware consumes them.
//
// Cần làm / To do:
// - registerSchema, loginSchema, forgotSchema, resetSchema.

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
  fullName: z.string().min(2, "Full name cannot be empty"),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password cannot be empty"),
});

const forgotSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const resetSchema = z.object({
  token: z.string().min(1, "Token cannot be empty"),
  newPassword: z
    .string()
    .min(6, "New password must be at least 6 characters long"),
});

module.exports = {
  registerSchema,
  loginSchema,
  forgotSchema,
  resetSchema,
};
