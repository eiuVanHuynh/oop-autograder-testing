const { z } = require("zod");
const { SCOPES, ENVIRONMENTS, TEMPLATE_STATUSES } = require("./options");

// Zod schemas for the templates group; the validate() middleware uses them.
//
// To do:
// - createTemplateSchema: template_name required, target_json must match one of the two shapes.

const createTemplateSchema = z.object({
  template_name: z
    .string()
    .min(2, "Template name must be at least 2 characters"),
  description: z.string().optional(),
  scope: z.enum(SCOPES).default("UI"),
  target_json: z
    .object({
      suiteId: z.number().int().positive().optional(),
      testIds: z.array(z.string()).optional(),
    })
    .refine(
      (data) => data.suiteId || (data.testIds && data.testIds.length > 0),
      {
        message:
          "target_json must contain either suiteId or a non-empty testIds array",
      },
    ),
  env: z.enum(ENVIRONMENTS).default("development"),
  status: z.enum(TEMPLATE_STATUSES).default("active"),
  timeout: z.number().int().positive().default(30000),
});

const updateTemplateSchema = createTemplateSchema.partial();

module.exports = {
  createTemplateSchema,
  updateTemplateSchema,
};
