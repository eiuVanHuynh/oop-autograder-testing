const { z } = require("zod");
const { ENVIRONMENTS } = require("./options");

// Schema zod cho nhóm runs; middleware validate() dùng các schema này.
// zod schemas for the runs group; the validate() middleware consumes them.
//
// Cần làm / To do:
// - createRunSchema: templateId HOẶC testIds, không cả hai; env, timeout tùy chọn.

// :id trong URL phải là số: thiếu bước này thì /runs/abc đi tới SQL và thành 500 thay vì 400.
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
    // Enum thay vì chuỗi tự do: gửi "prod" rồi tưởng đã chạy trên production là sai nguy hiểm.
    env: z.enum(ENVIRONMENTS).optional(),
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

module.exports = {
  createRunSchema,
  runIdParamsSchema,
};
