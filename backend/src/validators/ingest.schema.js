const { z } = require("zod");

// Schema zod cho nhóm ingest; middleware validate() dùng các schema này.
// Dữ liệu đến từ máy (GitHub Actions) nên vẫn phải kiểm: API key chỉ chứng minh "ai gửi",
// không chứng minh "gửi đúng".

// result_status của test_results có CHECK ở DB; chặn sớm tại đây để trả 400 thay vì 500.
const RESULT_STATUS = ['passed', 'failed', 'timedOut', 'skipped', 'interrupted'];

const addResultsSchema = z.object({
  results: z
    .array(
      z.object({
        code: z.string().min(1),
        status: z.enum(RESULT_STATUS),
        ms: z.number().int().nonnegative().optional(),
        actual: z.string().nullish(),
        error: z.string().nullish(),
      }),
    )
    .nonempty("results không được rỗng"),
});

const addLogsSchema = z.object({
  lines: z
    .array(
      z.object({
        level: z.enum(['info', 'warn', 'error']).default('info'),
        message: z.string(),
      }),
    )
    .nonempty("lines không được rỗng"),
});

// final_status: chỉ gửi khi nơi chạy biết một kết cục mà test_results không nói lên được.
const finishSchema = z.object({
  final_status: z.enum(['passed', 'failed', 'interrupted']).nullish(),
});

const setCiRunIdSchema = z.object({
  ciRunId: z.string().min(1),
});

module.exports = { addResultsSchema, addLogsSchema, finishSchema, setCiRunIdSchema, RESULT_STATUS };
