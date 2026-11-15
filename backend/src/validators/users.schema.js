const { z } = require("zod");
const { USER_ROLES, USER_STATUSES, lowerEnum, emailField } = require("./options");

// Zod schemas for the users group; the validate() middleware uses them.
const userQuerySchema = z
  .object({
    q: z.string().trim().optional(),
    role: lowerEnum(USER_ROLES).optional(),
    status: lowerEnum(USER_STATUSES).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(200).optional(),
  })
  .strip(); // query: unknown params are dropped, not a 400 (see catalog.schema.js)

const userIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// Admin creating an account for someone: role / status optional, the repository defaults to viewer + active.
const createUserSchema = z
  .object({
    fullName: z.string().trim().min(2),
    email: emailField,
    password: z.string().min(6),
    role: lowerEnum(USER_ROLES).optional(),
    status: lowerEnum(USER_STATUSES).optional(),
  })
  .strict();

// Profile edit: at least one field; role / status go through two dedicated endpoints.
const updateUserSchema = z
  .object({
    fullName: z.string().trim().min(2).optional(),
    email: emailField.optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: "At least one field is required to edit" });

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
