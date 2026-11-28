const router = require("express").Router();
const controller = require("../controllers/rerunRequests.controller");
const requireAuth = require("../middlewares/requireAuth");
const requireRole = require("../middlewares/requireRole");
const validate = require("../middlewares/validate");
const {
  createRerunRequestSchema,
  rerunRequestQuerySchema,
  idParamsSchema,
} = require("../validators/rerunRequests.schema");

// Dev asks for a rerun, Admin/Tester approves or rejects (SRS section 4, issue #97).
// POST /runs/:id/rerun-requests does NOT sit under /rerun-requests, so this group is mounted at the
// root and declares full paths (see the note in routes/index.js).
//
// Every line in this order: requireAuth → requireRole → validate → controller.
const canRequest = requireRole("admin", "tester", "dev"); // SRS section 4: Dev may REQUEST a rerun
const canDecide = requireRole("admin", "tester"); // only they may run a test, so only they may approve
const validateId = validate(idParamsSchema, "params");

// POST /api/runs/:id/rerun-requests – ask for a rerun of this run (Admin, Tester, Dev)
router.post(
  "/runs/:id/rerun-requests",
  requireAuth,
  canRequest,
  validateId,
  validate(createRerunRequestSchema),
  controller.createRequest,
);

// GET /api/rerun-requests?status= – the queue (any signed-in user)
router.get(
  "/rerun-requests",
  requireAuth,
  validate(rerunRequestQuerySchema, "query"),
  controller.getRequests,
);

// POST /api/rerun-requests/:id/approve – agree. The reply carries the old run's config so the UI can
// open Run Test with the template already filled in (Admin, Tester)
router.post(
  "/rerun-requests/:id/approve",
  requireAuth,
  canDecide,
  validateId,
  controller.approveRequest,
);

// POST /api/rerun-requests/:id/reject – refuse (Admin, Tester)
router.post(
  "/rerun-requests/:id/reject",
  requireAuth,
  canDecide,
  validateId,
  controller.rejectRequest,
);

module.exports = router;
