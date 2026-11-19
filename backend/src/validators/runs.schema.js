const { z } = require("zod");
const { ENVIRONMENTS } = require("./options");

// Zod schemas for the runs group; the validate() middleware uses them.
//
// To do:
// - createRunSchema: templateId OR testIds, never both; env and timeout optional.

// :id in the URL must be numeric: without this step /runs/abc reaches SQL and becomes a 500 instead of a 400.
const runIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const createRunSchema = z
  .object({
    templateId: z.number().int().positive().optional(),
    testIds: z
      .array(z.string())
      .nonempty("testIds array cannot be empty")
      .optional(),
    // An enum rather than free text: sending "prod" and believing it ran on production is a dangerous mistake.
    env: z.enum(ENVIRONMENTS).optional(),
    timeout: z.number().int().positive().optional(),
  })
  .refine(
    (data) => {
      const hasTemplate = data.templateId !== undefined;
      const hasTests = data.testIds !== undefined;
      // Exactly one of the two: templateId or testIds (never both, never neither)
      return (hasTemplate && !hasTests) || (!hasTemplate && hasTests);
    },
    {
      message:
        "Must provide either templateId OR testIds, but not both or neither",
    },
  );

module.exports = {
  createRunSchema,
  runIdParamsSchema,
};
