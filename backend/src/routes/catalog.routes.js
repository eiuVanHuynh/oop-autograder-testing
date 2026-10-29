const router = require("express").Router();
const catalogController = require("../controllers/catalog.controller");
const requireAuth = require("../middlewares/requireAuth");
const requireRole = require("../middlewares/requireRole");
const validate = require("../middlewares/validate");
const {
  caseQuerySchema,
  caseIdParamsSchema,
  replaceCaseStepsSchema,
  createCaseSchema,
} = require("../validators/catalog.schema");
// Suite / spec / case – nơi khai báo test, nguồn để chọn target.
// Suites / specs / cases – where tests are declared, the source for picking targets.
// Endpoint đầy đủ: api-endpoints.md mục 9.
// Full endpoint list: api-endpoints.md section 9.
//
// Cần làm / To do:
// - Mỗi dòng theo đúng thứ tự: requireAuth → requireRole → validate → controller.
// - Route chỉ khai báo URL, không có logic.

// TODO: khai báo các route của nhóm catalog
router.get("/cases/:id", requireAuth, catalogController.getCaseDetails);
router.put(
  "/cases/:id/steps",
  requireAuth,
  requireRole("admin", "tester"),
  validate(caseIdParamsSchema, "params"),
  validate(replaceCaseStepsSchema),
  catalogController.replaceCaseSteps,
);
router.get(
  "/cases",
  requireAuth,
  validate(caseQuerySchema, "query"),
  catalogController.getCases,
);
router.post(
  "/cases",
  requireAuth,
  requireRole("admin", "tester"),
  validate(createCaseSchema),
  catalogController.createCase,
);
router.get("/suites", requireAuth, catalogController.getSuites);
router.get(
  "/suites/:id/specs",
  requireAuth,
  validate(caseIdParamsSchema, "params"),
  catalogController.getSpecs,
);
module.exports = router;
