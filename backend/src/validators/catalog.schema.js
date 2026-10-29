const { z } = require("zod");
const caseQuerySchema = z
  .object({
    suite: z.coerce.number().int().positive().optional(),
    type: z
      .enum([
        "functional",
        "ui",
        "validation",
        "security",
        "performance",
        "usability",
        "audit",
      ])
      .optional(),
    priority: z.enum(["low", "medium", "high", "critical"]).optional(),
    status: z.enum(["draft", "ready", "deprecated"]).optional(),
  })
  .strict();
const createCaseSchema = z
  .object({
    spec_id: z.coerce.number().int().positive(),
    tc_code: z.string().trim().min(1).max(100),
    title: z.string().trim().min(1).max(255),
    expected_result: z.string().trim().min(1, "expected_result is required"),
    preconditions: z.string().nullable().optional(),
    priority: z.enum(["low", "medium", "high", "critical"]),
    test_type: z.enum([
      "functional",
      "ui",
      "validation",
      "security",
      "performance",
      "usability",
      "audit",
    ]),
    test_status: z.enum(["draft", "ready", "deprecated"]).optional(),
  })
  .strict();
// Schema zod cho nhóm catalog; middleware validate() dùng các schema này.
// zod schemas for the catalog group; the validate() middleware consumes them.
//
// Cần làm / To do:
// - caseQuerySchema: suite, type, priority, status.

// TODO

const caseIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const replaceCaseStepsSchema = z
  .object({
    steps: z.array(
      z
        .object({
          step_action: z.string().trim().min(1),
          step_target: z.string().max(255).nullable().optional(),
          expected_result: z.string().nullable().optional(),
        })
        .strict(),
    ),
  })
  .strict();

module.exports = {
  caseQuerySchema,
  caseIdParamsSchema,
  replaceCaseStepsSchema,
  createCaseSchema,
};
