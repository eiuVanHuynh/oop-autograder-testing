const { z } = require("zod");
const { USER_ROLES, USER_STATUSES, lowerEnum } = require("./options");

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

const changeRoleSchema = z.object({ role: lowerEnum(USER_ROLES) }).strict();
const changeStatusSchema = z.object({ status: lowerEnum(USER_STATUSES) }).strict();

module.exports = {
  userQuerySchema,
  userIdParamsSchema,
  changeRoleSchema,
  changeStatusSchema,
};
