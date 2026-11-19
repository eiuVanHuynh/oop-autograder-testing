const { z } = require("zod");
const { BUG_SEVERITIES, BUG_STATUSES, lowerEnum } = require("./options");

// Zod schemas for the bugs group; the validate() middleware uses them.
const createBugSchema = z
  .object({
    title: z.string().trim().min(1).max(255),
    description: z.string().nullable().optional(),
    severity: lowerEnum(BUG_SEVERITIES),
  })
  .strict();

// Usually only status changes; an empty body has nothing to write.
const updateBugSchema = z
  .object({
    title: z.string().trim().min(1).max(255).optional(),
    description: z.string().nullable().optional(),
    severity: lowerEnum(BUG_SEVERITIES).optional(),
    status: lowerEnum(BUG_STATUSES).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required to update",
  });

const bugQuerySchema = z
  .object({
    status: lowerEnum(BUG_STATUSES).optional(),
    severity: lowerEnum(BUG_SEVERITIES).optional(),
  })
  .strip(); // query: unknown params are dropped, not a 400 (see catalog.schema.js)

const idParamsSchema = z.object({ id: z.coerce.number().int().positive() });

module.exports = { createBugSchema, updateBugSchema, bugQuerySchema, idParamsSchema };
