const { z } = require("zod");
const {
  CASE_PRIORITIES,
  CASE_TYPES,
  CASE_STATUSES,
} = require("./options");
const caseQuerySchema = z
  .object({
    suite: z.coerce.number().int().positive().optional(),
    type: z.enum(CASE_TYPES).optional(),
    priority: z.enum(CASE_PRIORITIES).optional(),
    status: z.enum(CASE_STATUSES).optional(),
  })
  // KHÔNG .strict() cho query: một tham số lạ (cache-buster "_", tham số FE thêm sau) không
  // đáng để cả trang trắng vì 400. Body thì vẫn strict — ở đó key lạ thường là viết sai tên.
  .strip();
const createCaseSchema = z
  .object({
    spec_id: z.coerce.number().int().positive(),
    tc_code: z.string().trim().min(1).max(100),
    title: z.string().trim().min(1).max(255),
    expected_result: z.string().trim().min(1, "expected_result is required"),
    preconditions: z.string().nullable().optional(),
    priority: z.enum(CASE_PRIORITIES),
    test_type: z.enum(CASE_TYPES),
    test_status: z.enum(CASE_STATUSES).optional(),
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
          // FILL: tên field trong test_data mà bước này điền.
          field_name: z.string().trim().max(100).nullable().optional(),
        })
        .strict(),
    ),
  })
  .strict();

const replaceCaseDataSchema = z
  .object({
    data: z.array(
      z
        .object({
          field_name: z.string().trim().min(1).max(100),
          // Giữ nguyên chuỗi "env:TEN_BIEN": nơi chạy test mới giải, backend không giải.
          data_value: z.string().nullable().optional(),
          is_valid: z.boolean().optional(),
        })
        .strict(),
    ),
  })
  .strict()
  // Hai dòng cùng field_name trong một case là trạng thái không ai giải được: bước FILL chỉ
  // đọc được một giá trị. Chặn ngay ở cửa API thay vì để runner đoán (xem toDataMap).
  .superRefine((body, ctx) => {
    const seen = new Set();
    body.data.forEach((row, i) => {
      if (seen.has(row.field_name)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["data", i, "field_name"],
          message: `field_name "${row.field_name}" bị gửi hai lần`,
        });
      }
      seen.add(row.field_name);
    });
  });

const caseDataParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
  field: z.string().trim().min(1).max(100),
});

// Sửa metadata: mọi trường tùy chọn, nhưng body rỗng thì không có gì để ghi.
// tc_code và spec_id bị loại: mã test là bất biến sau khi tạo (xem CatalogRepository.updateCase).
const updateCaseSchema = createCaseSchema
  .omit({ spec_id: true, tc_code: true })
  .partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Cần ít nhất một trường để cập nhật",
  });

module.exports = {
  caseQuerySchema,
  replaceCaseDataSchema,
  caseDataParamsSchema,
  updateCaseSchema,
  caseIdParamsSchema,
  replaceCaseStepsSchema,
  createCaseSchema,
};
