const router = require("express").Router();
const runsController = require("../controllers/runs.controller");
const {
  createRunSchema,
  runIdParamsSchema,
  resultParamsSchema,
} = require("../validators/runs.schema");
const requireAuth = require("../middlewares/requireAuth");
const requireRole = require("../middlewares/requireRole");
const validate = require("../middlewares/validate");

// Who may do what: api-endpoints.md section 6. Dev/viewer may not run tests.
const canRun = requireRole("admin", "tester");
const validateId = validate(runIdParamsSchema, "params");

// Run tests, follow logs, history, cancel, rerun.
// Full endpoint list: api-endpoints.md section 6.
//
// To do:
// - Every line in this order: requireAuth → requireRole → validate → controller.
// - A route only declares the URL, it holds no logic.

// GET /api/runs - View test run history (any signed-in user)
router.get("/", requireAuth, runsController.getRuns);

// GET /api/runs/:id - View details of one run (any signed-in user)
router.get("/:id", requireAuth, validateId, runsController.getRunById);

// POST /api/runs - Press "Run Test" to create a new run (Admin, Tester)
router.post(
  "/",
  requireAuth,
  canRun,
  validate(createRunSchema),
  runsController.createRun,
);

// POST /api/runs/:id/cancel - Cancel a running test (Admin, Tester)
router.post("/:id/cancel", requireAuth, canRun, validateId, runsController.cancelRun);

// POST /api/runs/:id/rerun - Rerun using the previous config (Admin, Tester)
router.post("/:id/rerun", requireAuth, canRun, validateId, runsController.rerunRun);

// GET /api/runs/:id/logs?after= - Poll logs by seq (any signed-in user)
router.get("/:id/logs", requireAuth, validateId, runsController.getRunLogs);

// GET /api/runs/:id/results - Per-test-case results, with evidences (any signed-in user)
router.get("/:id/results", requireAuth, validateId, runsController.getRunResults);

// GET /api/runs/:id/results/:resultId/evidences - Screenshot / trace of ONE result (any signed-in user).
// GET /:id/results already embeds an evidences array per case, so this route exists for the case the list
// cannot answer: a resultId that does not belong to this run must be a 404, not an empty array.
router.get(
  "/:id/results/:resultId/evidences",
  requireAuth,
  validate(resultParamsSchema, "params"),
  runsController.getResultEvidences,
);

// shortcut: the route below is still off because runs.service.js has no streamRunLogs — wiring it up gives a 500
// on the first call. Remove the // once the service has that function (polling /logs keeps working meanwhile).
// GET /api/runs/:id/logs/stream - Live logs over SSE (any user)
// router.get("/:id/logs/stream", requireAuth, runsController.streamRunLogs);


module.exports = router;
