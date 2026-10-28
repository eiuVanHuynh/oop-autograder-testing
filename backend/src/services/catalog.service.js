const { toApi } = require('../utils/mappers');
const AppError = require('../utils/AppError');
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
      const error = new Error('Test case not found');
      error.statusCode = 404;
      throw error;
    }

    const { test_data, testData, ...caseData } = toApi(testCase);

    return {
      ...caseData,
      steps: testCase.steps.map((step) => toApi(step)),
      testData: (test_data ?? testData ?? testCase.test_data ?? []).map(
        (item) => toApi(item)
      ),
    };
  }
  async replaceCaseSteps(id, steps) {
    const result = await this.catalogRepository.replaceCaseSteps(id, steps);

    if (result === null) {
      throw new AppError(
        404,
        'NOT_FOUND',
        'Test case not found'
      );
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
  async createCase(data) {
    const testCase = await this.catalogRepository.createCase(data);
    return toApi(testCase);
  }
  // TODO
}

module.exports = CatalogService;
