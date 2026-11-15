const router = require("express").Router();
const templateController = require("../controllers/templates.controller");
const {
  createTemplateSchema,
  updateTemplateSchema,
} = require("../validators/templates.schema");
const requireAuth = require("../middlewares/requireAuth");
const requireRole = require("../middlewares/requireRole");
const validate = require("../middlewares/validate");

// Who may do what: api-endpoints.md section 4.
const canWrite = requireRole("admin", "tester");

// Template – what the user picks to run (new test_templates table).
// Full endpoint list: api-endpoints.md section 4.
//
// To do:
// - Every line in this order: requireAuth → requireRole → validate → controller.
// - A route only declares the URL, it holds no logic.

// GET /api/templates - List templates (any signed-in user)
router.get("/", requireAuth, templateController.getTemplates);

// GET /api/templates/:id - View one template (any signed-in user)
router.get("/:id", requireAuth, templateController.getTemplateById);

// POST /api/templates - Create a template (Admin, Tester)
router.post(
  "/",
  requireAuth,
  canWrite,
  validate(createTemplateSchema),
  templateController.createTemplate,
);

// PUT /api/templates/:id - Edit a template (Admin, Tester)
router.put(
  "/:id",
  requireAuth,
  canWrite,
  validate(updateTemplateSchema),
  templateController.updateTemplate,
);

// DELETE /api/templates/:id - Delete a template (Admin, Tester)
router.delete("/:id", requireAuth, canWrite, templateController.deleteTemplate);

// POST /api/templates/:id/duplicate - Duplicate a template (Admin, Tester)
router.post(
  "/:id/duplicate",
  requireAuth,
  canWrite,
  templateController.duplicateTemplate,
);

module.exports = router;
