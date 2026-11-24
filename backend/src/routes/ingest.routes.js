const router = require('express').Router();
const ingestController = require('../controllers/ingest.controller');
const requireApiKey = require('../middlewares/requireApiKey');
const validate = require('../middlewares/validate');
const {
  addResultsSchema, addLogsSchema, finishSchema, setCiRunIdSchema, addEvidencesSchema,
} = require('../validators/ingest.schema');

// Back door for machines: Playwright pushes results and logs back.
// Full endpoint list: api-endpoints.md section 8.
// Every line in this order: requireApiKey → validate → controller. The route holds no logic.
// The whole group uses x-api-key, NOT requireAuth: a machine has no JWT.
router.use(requireApiKey);

// GET /api/ingest/runs/:id/plan - Fetch the run plan (cases + steps + data)
router.get('/runs/:id/plan', ingestController.getPlan);

// POST /api/ingest/runs/:id/ci-run-id - Report GITHUB_RUN_ID back so the run can be cancelled
router.post('/runs/:id/ci-run-id', validate(setCiRunIdSchema), ingestController.setCiRunId);

// POST /api/ingest/runs/:id/logs - Push logs in batches
router.post('/runs/:id/logs', validate(addLogsSchema), ingestController.addLogs);

// POST /api/ingest/runs/:id/results - Push the result of each test case
router.post('/runs/:id/results', validate(addResultsSchema), ingestController.addResults);

// PATCH /api/ingest/runs/:id/finish - Report that the run has finished
router.patch('/runs/:id/finish', validate(finishSchema), ingestController.finish);

// POST /api/ingest/results/:id/evidences - Push screenshot/trace LOCATIONS of one result.
// The body carries URLs/paths, never file bytes (see ResultRepository), so there is no 413 here:
// uploading the files themselves needs object storage, which this project does not have.
router.post('/results/:id/evidences', validate(addEvidencesSchema), ingestController.addEvidences);

module.exports = router;
