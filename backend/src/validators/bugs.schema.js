const { z } = require("zod");
const { BUG_SEVERITIES, BUG_STATUSES, lowerEnum } = require("./options");

// Schema zod cho nhóm bugs; middleware validate() dùng các schema này.
const createBugSchema = z
  .object({
    title: z.string().trim().min(1).max(255),
    description: z.string().nullable().optional(),
    severity: lowerEnum(BUG_SEVERITIES),
  })
  .strict();

// Thường chỉ đổi status; body rỗng thì không có gì để ghi.
const updateBugSchema = z
  .object({
    title: z.string().trim().min(1).max(255).optional(),
    description: z.string().nullable().optional(),
    severity: lowerEnum(BUG_SEVERITIES).optional(),
    status: lowerEnum(BUG_STATUSES).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Cần ít nhất một trường để cập nhật",
  });

const bugQuerySchema = z
  .object({
    status: lowerEnum(BUG_STATUSES).optional(),
    severity: lowerEnum(BUG_SEVERITIES).optional(),
  })
  .strip(); // query: tham số lạ bỏ qua, không 400 (xem catalog.schema.js)

const idParamsSchema = z.object({ id: z.coerce.number().int().positive() });

module.exports = { createBugSchema, updateBugSchema, bugQuerySchema, idParamsSchema };
