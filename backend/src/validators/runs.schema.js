const { z } = require("zod");

// Schema zod cho nhóm runs; middleware validate() dùng các schema này.
// zod schemas for the runs group; the validate() middleware consumes them.
//
// Cần làm / To do:
// - createRunSchema: templateId HOẶC testIds, không cả hai; env, timeout tùy chọn.

const createRunSchema = z
  .object({
    templateId: z.number().int().positive().optional(),
    testIds: z
      .array(z.string())
      .nonempty("testIds array cannot be empty")
      .optional(),
    env: z.string().optional(),
    timeout: z.number().int().positive().optional(),
  })
  .refine(
    (data) => {
      const hasTemplate = data.templateId !== undefined;
      const hasTests = data.testIds !== undefined;
      // Phải chọn 1 trong 2: hoặc templateId, hoặc testIds (không được có cả 2, cũng không được trống cả 2)
      return (hasTemplate && !hasTests) || (!hasTemplate && hasTests);
    },
    {
      message:
        "Must provide either templateId OR testIds, but not both or neither",
    },
  );

const validate = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error.errors
        ? error.errors
            .map((e) => `${e.path.join(".")}: ${e.message}`)
            .join(", ")
        : "Validation error",
    });
  }
};

module.exports = {
  createRunSchema,
  validateCreateRun: validate(createRunSchema),
};
