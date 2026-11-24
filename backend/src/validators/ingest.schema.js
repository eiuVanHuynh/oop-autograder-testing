const { z } = require("zod");

// Zod schemas for the ingest group; the validate() middleware uses them.
// The data comes from a machine (GitHub Actions) and still must be checked: an API key only proves "who sent it",
// not "that it is correct".

// test_results.result_status has a CHECK in the DB; block it early here to return 400 instead of 500.
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
    .nonempty("results must not be empty"),
});

const addLogsSchema = z.object({
  lines: z
    .array(
      z.object({
        level: z.enum(['info', 'warn', 'error']).default('info'),
        message: z.string(),
      }),
    )
    .nonempty("lines must not be empty"),
});

// final_status: only sent when the runner knows an outcome that test_results cannot express.
const finishSchema = z.object({
  final_status: z.enum(['passed', 'failed', 'interrupted']).nullish(),
});

// test_evidences.evidence_type has a CHECK in the DB; file_path is VARCHAR(500).
const EVIDENCE_TYPES = ['screenshot', 'trace'];

const addEvidencesSchema = z.object({
  evidences: z
    .array(
      z.object({
        type: z.enum(EVIDENCE_TYPES),
        // A location (GitHub artifact URL or a path inside it), not the file itself — see ResultRepository.
        path: z.string().trim().min(1).max(500),
      }),
    )
    .nonempty("evidences must not be empty"),
});

const setCiRunIdSchema = z.object({
  ciRunId: z.string().min(1),
});

module.exports = {
  addResultsSchema,
  addLogsSchema,
  finishSchema,
  setCiRunIdSchema,
  addEvidencesSchema,
  RESULT_STATUS,
  EVIDENCE_TYPES,
};
