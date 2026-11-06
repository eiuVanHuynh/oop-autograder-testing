const { z } = require("zod");
const { USER_ROLES, USER_STATUSES, lowerEnum, emailField } = require("./options");

// Schema zod cho nhóm users; middleware validate() dùng các schema này.
const userQuerySchema = z
  .object({
    q: z.string().trim().optional(),
    role: lowerEnum(USER_ROLES).optional(),
    status: lowerEnum(USER_STATUSES).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(200).optional(),
  })
  .strip(); // query: tham số lạ bỏ qua, không 400 (xem catalog.schema.js)

const userIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// Admin tạo tài khoản hộ: vai trò / trạng thái tùy chọn, repository mặc định viewer + active.
const createUserSchema = z
  .object({
    fullName: z.string().trim().min(2),
    email: emailField,
    password: z.string().min(6),
    role: lowerEnum(USER_ROLES).optional(),
    status: lowerEnum(USER_STATUSES).optional(),
  })
  .strict();

// Sửa hồ sơ: ít nhất một trường, vai trò / trạng thái đi qua hai endpoint riêng.
const updateUserSchema = z
  .object({
    fullName: z.string().trim().min(2).optional(),
    email: emailField.optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: "Cần ít nhất một trường để sửa" });

const changeRoleSchema = z.object({ role: lowerEnum(USER_ROLES) }).strict();
const changeStatusSchema = z.object({ status: lowerEnum(USER_STATUSES) }).strict();

module.exports = {
  userQuerySchema,
  userIdParamsSchema,
  createUserSchema,
  updateUserSchema,
  changeRoleSchema,
  changeStatusSchema,
};
