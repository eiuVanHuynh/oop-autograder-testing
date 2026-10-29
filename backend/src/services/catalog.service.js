const { toApi } = require("../utils/mappers");
const AppError = require("../utils/AppError");
// Suite / spec / case – nơi khai báo test, nguồn để chọn target.
// Suites / specs / cases – where tests are declared, the source for picking targets.
// Quy tắc nghiệp vụ nằm ở đây. Không require pg, không chạm req/res.
// Business rules live here. Never require pg, never touch req/res.
// Nhận repository qua constructor để test thay được bằng bản giả.
// Takes its repositories through the constructor so tests can pass fakes.
//
// Cần làm / To do:
// - Chỉ test_status = 'ready' mới được chạy; draft và deprecated bị bỏ qua.
// - Cũng là nguồn cho helper loadTestCase(tcCode) bên automation/.
class CatalogService {
  constructor(deps = {}) {
    this.catalogRepository = deps.catalogRepository;
    // TODO: nhận repository cần dùng từ config/container.js
  }
  async getCaseDetails(id) {
    const testCase = await this.catalogRepository.findCaseDetails(id);

    if (!testCase) {
      const error = new Error("Test case not found");
      error.statusCode = 404;
      throw error;
    }

    const { test_data, testData, ...caseData } = toApi(testCase);

    return {
      ...caseData,
      steps: testCase.steps.map((step) => toApi(step)),
      testData: (test_data ?? testData ?? testCase.test_data ?? []).map(
        (item) => toApi(item),
      ),
    };
  }
  async replaceCaseSteps(id, steps) {
    const result = await this.catalogRepository.replaceCaseSteps(id, steps);

    if (result === null) {
      throw new AppError(404, "NOT_FOUND", "Test case not found");
    }

    return {
      test_id: id,
      steps: result.map((step) => toApi(step)),
    };
  }
  async getCases(filters = {}) {
    const cases = await this.catalogRepository.findCases(filters);
    return cases.map((testCase) => toApi(testCase));
  }
  async getSuites() {
    return (await this.catalogRepository.findSuites()).map((r) => toApi(r));
  }
  async getSpecs(suiteId) {
    return (await this.catalogRepository.findSpecsBySuite(suiteId)).map((r) =>
      toApi(r),
    );
  }
  async createCase(data) {
    try {
      const testCase = await this.catalogRepository.createCase(data);
      return toApi(testCase);
    } catch (err) {
      if (err.code === "23505")
        // UNIQUE: tc_code (hoặc automation_ref)
        throw new AppError(
          409,
          "CONFLICT",
          `tc_code "${data.tc_code}" đã tồn tại`,
        );
      if (err.code === "23503")
        // FK: spec_id không có thật
        throw new AppError(400, "VALIDATION_ERROR", "spec_id không tồn tại");
      throw err;
    }
  }
}

module.exports = CatalogService;
