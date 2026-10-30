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

// TODO: các hàm xử lý, bọc trong asyncHandler
const getCases = asyncHandler(async (req, res) => {
  const cases = await catalogService.getCases(req.query);
  res.status(200).json({ data: cases });
});
const createCase = asyncHandler(async (req, res) => {
  const testCase = await catalogService.createCase(req.body);
  res.status(201).json({ data: testCase });
});
const getCaseDetails = asyncHandler(async (req, res) => {
  const testCase = await catalogService.getCaseDetails(req.params.id);
  res.status(200).json({ data: testCase });
});
const getSuites = asyncHandler(async (req, res) => {
  res.status(200).json({ data: await catalogService.getSuites() });
});
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
const updateCase = asyncHandler(async (req, res) => {
  const testCase = await catalogService.updateCase(req.params.id, req.body);
  res.status(200).json({ data: testCase });
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
};
