const router = require("express").Router();
const catalogController = require("../controllers/catalog.controller");
const requireAuth = require("../middlewares/requireAuth");  //check login
const requireRole = require("../middlewares/requireRole");  //check role
const validate = require("../middlewares/validate");        //check validation  
const {
  caseQuerySchema,
  caseIdParamsSchema,
  replaceCaseStepsSchema,
  replaceCaseDataSchema,
  caseDataParamsSchema,
  createCaseSchema,
  updateCaseSchema,
  updateCaseStatusSchema,
  addCaseStepSchema,
  stepIdParamsSchema,
  reorderCaseStepsSchema,
  createSpecSchema,
  updateSpecSchema,
  createSuiteSchema,
  updateSuiteSchema,
} = require("../validators/catalog.schema"); //check db 
// Suite / spec / case – nơi khai báo test, nguồn để chọn target.
// Suites / specs / cases – where tests are declared, the source for picking targets.
// Endpoint đầy đủ: api-endpoints.md mục 9.
// Full endpoint list: api-endpoints.md section 9.
//
// Cần làm / To do:
// - Mỗi dòng theo đúng thứ tự: requireAuth → requireRole → validate → controller.
// - Route chỉ khai báo URL, không có logic.

// TODO: khai báo các route của nhóm catalog
//search steps
router.put(
  "/cases/:id/steps",
  requireAuth,
  requireRole("admin", "tester"),
  validate(caseIdParamsSchema, "params"),
  validate(replaceCaseStepsSchema),
  catalogController.replaceCaseSteps,
);
// POST /api/catalog/cases/:id/steps
router.post(
  "/cases/:id/steps",
  requireAuth,
  requireRole("admin", "tester"),
  validate(caseIdParamsSchema, "params"),
  validate(addCaseStepSchema),
  catalogController.addCaseStep,
);

// DELETE /api/catalog/teststeps/:stepId
router.delete(
  "/teststeps/:stepId",
  requireAuth,
  requireRole("admin", "tester"),
  validate(stepIdParamsSchema, "params"),
  catalogController.deleteCaseStep,
);

// PUT /api/catalog/cases/:id/steps/reorder
router.put(
  "/cases/:id/steps/reorder",
  requireAuth,
  requireRole("admin", "tester"),
  validate(caseIdParamsSchema, "params"),
  validate(reorderCaseStepsSchema),
  catalogController.reorderCaseSteps,
);

//search Data
router.put(
  "/cases/:id/data",
  requireAuth,
  requireRole("admin", "tester"),
  validate(caseIdParamsSchema, "params"),
  validate(replaceCaseDataSchema),
  catalogController.replaceCaseData,
);
router.delete(
  "/cases/:id/data/:field",
  requireAuth,
  requireRole("admin", "tester"),
  validate(caseDataParamsSchema, "params"),
  catalogController.deleteCaseDataField,
);
//POST /api/catalog/cases 
router.post(
  "/cases",
  requireAuth,
  requireRole("admin", "tester"),
  validate(createCaseSchema),
  catalogController.createCase,
);
///GET api/catalog/cases/:id
router.get(
  "/cases/:id",
  requireAuth,
  validate(caseIdParamsSchema, "params"),
  catalogController.getCaseDetails,
);
///GET api/catalog/cases
router.get(
  "/cases",
  requireAuth,
  validate(caseQuerySchema, "query"),
  catalogController.getCases,
);
//DELETE api/catalog/cases/:id
router.delete(
  "/cases/:id",
  requireAuth,
  requireRole("admin", "tester"),
  validate(caseIdParamsSchema, "params"),
  catalogController.deleteCase,
);
//PUT /api/catalog/cases/:id
router.put(
  "/cases/:id",
  requireAuth,
  requireRole("admin", "tester"),
  validate(caseIdParamsSchema, "params"),
  validate(updateCaseSchema),
  catalogController.updateCase,
);
//PATCH api/catalog/cases/:id/status
router.patch(
  "/cases/:id/status",
  requireAuth,
  requireRole("admin", "tester"),
  validate(caseIdParamsSchema, "params"),
  validate(updateCaseStatusSchema),
  catalogController.updateCaseStatus,
);
//GET api/testcases/{id}/steps
router.get(
  "/cases/:id/steps",
  requireAuth,
  validate(caseIdParamsSchema, "params"),
  catalogController.getCaseSteps,
);
//GET api/testcases/{id}/data
router.get(
  "/cases/:id/data",
  requireAuth,
  validate(caseIdParamsSchema, "params"),
  catalogController.getCaseData,
);
// GET /api/catalog/suites 
router.get("/suites", requireAuth, catalogController.getSuites);
// GET /api/catalog/suites/:id/specs
router.get(
  "/suites/:id/specs",
  requireAuth,
  validate(caseIdParamsSchema, "params"),
  catalogController.getSpecs,
);
module.exports = router;
// POST /api/catalog/suites
router.post(
  "/suites",
  requireAuth,
  requireRole("admin", "tester"),
  validate(createSuiteSchema),
  catalogController.createSuite,
);

// PUT /api/catalog/suites/:id
router.put(
  "/suites/:id",
  requireAuth,
  requireRole("admin", "tester"),
  validate(caseIdParamsSchema, "params"),
  validate(updateSuiteSchema),
  catalogController.updateSuite,
);

// DELETE /api/catalog/suites/:id
router.delete(
  "/suites/:id",
  requireAuth,
  requireRole("admin", "tester"),
  validate(caseIdParamsSchema, "params"),
  catalogController.deleteSuite,
);

// POST /api/catalog/testspecs
router.post(
  "/testspecs",
  requireAuth,
  requireRole("admin", "tester"),
  validate(createSpecSchema),
  catalogController.createSpec,
);
// PUT /api/catalog/testspecs/:id
router.put(
  "/testspecs/:id",
  requireAuth,
  requireRole("admin", "tester"),
  validate(caseIdParamsSchema, "params"),
  validate(updateSpecSchema),
  catalogController.updateSpec,
);
// DELETE /api/catalog/testspecs/:id
router.delete(
  "/testspecs/:id",
  requireAuth,
  requireRole("admin", "tester"),
  validate(caseIdParamsSchema, "params"),
  catalogController.deleteSpec,
);
// GET /api/catalog/suites/:id
router.get(
  "/suites/:id",
  requireAuth,
  validate(caseIdParamsSchema, "params"),
  catalogController.getSuiteById,
);