const asyncHandler = require("../utils/asyncHandler");
const { catalogService } = require("../config/container");

// Suite / spec / case – nơi khai báo test, nguồn để chọn target.
// Suites / specs / cases – where tests are declared, the source for picking targets.
// Controller mỏng: đọc req → gọi service → res.json({ data }). Không có quy tắc nghiệp vụ.
// Thin controller: read req → call the service → res.json({ data }). No business rules here.
//
// Cần làm / To do:
// - GET /suites, /suites/:id/specs, /cases có lọc, /cases/:id. Phần ghi là 🟡, làm sau.
// - Trả đúng status code ghi trong api-endpoints.md mục 9.

// TODO: các hàm xử lý, bọc trong asyncHandler.
// search testcase
const createCase = asyncHandler(async (req, res) => {
  const testCase = await catalogService.createCase(req.body);
  res.status(201).json({ data: testCase });       //HTTP 201 = Created
});
const getCases = asyncHandler(async (req, res) => {
  const cases = await catalogService.getCases(req.query);
  res.status(200).json({ data: cases });
});
const getCaseDetails = asyncHandler(async (req, res) => {
  const testCase = await catalogService.getCaseDetails(req.params.id);
  res.status(200).json({ data: testCase });
});
const updateCase = asyncHandler(async (req, res) => {
  const testCase = await catalogService.updateCase(req.params.id, req.body);
  res.status(200).json({ data: testCase });
});
const deleteCase = asyncHandler(async (req, res) => {
  await catalogService.deleteCase(req.params.id);
  res.status(204).send();
});
const updateCaseStatus = asyncHandler(async (req, res) => {
  const testCase = await catalogService.updateCaseStatus(
    req.params.id,
    req.body.test_status,
  );

  res.status(200).json({ data: testCase });
});
const getCaseSteps = asyncHandler(async (req, res) => {
  const steps = await catalogService.getCaseSteps(req.params.id);

  res.status(200).json({ data: steps });
});
const getCaseData = asyncHandler(async (req, res) => {
  const data = await catalogService.getCaseData(req.params.id);

  res.status(200).json({ data });
});
//search suite 
const getSuites = asyncHandler(async (req, res) => {
  res.status(200).json({ data: await catalogService.getSuites() });
});
const getSuiteById = asyncHandler(async (req, res) => {
  const suite = await catalogService.getSuiteById(req.params.id);
  res.status(200).json({ data: suite });
});
const createSuite = asyncHandler(async (req, res) => {
  const suite = await catalogService.createSuite(req.body);
  res.status(201).json({ data: suite });
});
const updateSuite = asyncHandler(async (req, res) => {
  const suite = await catalogService.updateSuite(req.params.id, req.body);
  res.status(200).json({ data: suite });
});
const deleteSuite = asyncHandler(async (req, res) => {
  await catalogService.deleteSuite(req.params.id);
  res.status(200).json({
    message: "Suite deleted successfully",
  });
});
//search spec 
const getSpecs = asyncHandler(async (req, res) => {
  res.status(200).json({ data: await catalogService.getSpecs(req.params.id) });
});
const replaceCaseSteps = asyncHandler(async (req, res) => {
  const result = await catalogService.replaceCaseSteps(
    req.params.id,
    req.body.steps,
  );

  res.status(200).json({ data: result });
});
const createSpec = asyncHandler(async (req, res) => {
  const spec = await catalogService.createSpec(req.body, req.user);
  res.status(201).json({ data: spec });
});

const updateSpec = asyncHandler(async (req, res) => {
  const spec = await catalogService.updateSpec(
    req.params.id,
    req.body,
    req.user,
  );
  res.status(200).json({ data: spec });
});

const deleteSpec = asyncHandler(async (req, res) => {
  await catalogService.deleteSpec(req.params.id);
  res.status(200).json({
    message: "Specification deleted successfully",
  });
});
//search data 
const replaceCaseData = asyncHandler(async (req, res) => {
  const result = await catalogService.replaceCaseData(
    req.params.id,
    req.body.data,
  );

  res.status(200).json({ data: result });
});
const deleteCaseDataField = asyncHandler(async (req, res) => {
  await catalogService.deleteCaseDataField(req.params.id, req.params.field);
  res.status(204).send();
});


//search steps 
const addCaseStep = asyncHandler(async (req, res) => {
  const step = await catalogService.addCaseStep(req.params.id, req.body);

  res.status(201).json({ data: step });
});

const deleteCaseStep = asyncHandler(async (req, res) => {
  await catalogService.deleteCaseStep(req.params.stepId);

  res.status(204).send();
});

const reorderCaseSteps = asyncHandler(async (req, res) => {
  const steps = await catalogService.reorderCaseSteps(
    req.params.id,
    req.body.steps,
  );

  res.status(200).json({ data: steps });
});

module.exports = {
  getCases,
  replaceCaseData,
  deleteCaseDataField,
  updateCase,
  getCaseDetails,
  replaceCaseSteps,
  createCase,
  getSuites,
  getSpecs,
  deleteCase,
  updateCaseStatus,
  getCaseSteps,
  getCaseData,
  addCaseStep,
  deleteCaseStep,
  reorderCaseSteps,
  createSpec,
  updateSpec,
  deleteSpec,
  createSuite,
  updateSuite,
  deleteSuite,
  getSuiteById,
};
