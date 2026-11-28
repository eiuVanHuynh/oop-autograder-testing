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

// Per-file ceiling for `data`, in base64 characters (~1.1 MB of real bytes). app.js parses at most 2mb of
// JSON per request, so a bigger file would be a 413 the runner cannot act on; it skips oversize files and
// logs a line instead. A viewport PNG from Playwright is 50–300 KB, well inside this.
const MAX_DATA_CHARS = 1_500_000;

const addEvidencesSchema = z.object({
  evidences: z
    .array(
      z.object({
        type: z.enum(EVIDENCE_TYPES),
        // The runner's own path to the file. Kept as-is when `data` is absent; replaced by the public
        // /api/evidences/<token> URL when it is there (see ingest.service).
        path: z.string().trim().min(1).max(500),
        // The file itself, base64. Optional: a trace zip is sent as a path only.
        data: z.string().base64().max(MAX_DATA_CHARS).optional(),
        mime: z.string().trim().min(1).max(100).optional(),
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
