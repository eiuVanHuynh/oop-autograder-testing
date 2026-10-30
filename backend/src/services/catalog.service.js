const { toApi } = require("../utils/mappers");
const AppError = require("../utils/AppError");
const { requiredFields } = require("./runner/steps");
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
// Lỗi ràng buộc của test_cases → lỗi API. Dùng cho cả create và update.
const caseWriteError = (err, tcCode) => {
  if (err.code === "23505")
    // UNIQUE: tc_code (hoặc automation_ref)
    return new AppError(409, "CONFLICT", `tc_code "${tcCode}" đã tồn tại`);
  if (err.code === "23503")
    // FK: spec_id không có thật
    return new AppError(400, "VALIDATION_ERROR", "spec_id không tồn tại");
  return err;
};

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
  // Sửa steps/data có thể làm một case ĐANG 'ready' không còn chạy được (xoá hết bước, bỏ
  // field mà bước FILL cần). Chặn sửa thì không ai sửa được case đã ready; để nguyên thì
  // 'ready' thành lời hứa sai và run fail giữa đường. Nên: tự hạ về 'draft' và NÓI RA.
  async _demoteIfBroken(id) {
    const current = await this.catalogRepository.findCaseDetails(id);
    if (!current || current.test_status !== "ready") return null;

    try {
      await this._assertRunnable(id);
      return null;
    } catch (err) {
      if (err.code !== "NOT_RUNNABLE") throw err;
      await this.catalogRepository.updateCase(id, { test_status: "draft" });
      return err.message;
    }
  }
  async replaceCaseSteps(id, steps) {
    const result = await this.catalogRepository.replaceCaseSteps(id, steps);

    if (result === null) {
      throw new AppError(404, "NOT_FOUND", "Test case not found");
    }

    const demoted = await this._demoteIfBroken(id);

    return {
      test_id: id,
      steps: result.map((step) => toApi(step)),
      ...(demoted ? { testStatus: "DRAFT", demotedReason: demoted } : {}),
    };
  }
  async replaceCaseData(id, data) {
    const result = await this.catalogRepository.replaceCaseData(id, data);

    if (result === null) {
      throw new AppError(404, "NOT_FOUND", "Test case not found");
    }

    const demoted = await this._demoteIfBroken(id);

    return {
      test_id: id,
      testData: result.map((row) => toApi(row)),
      ...(demoted ? { testStatus: "DRAFT", demotedReason: demoted } : {}),
    };
  }
  async deleteCaseDataField(id, fieldName) {
    const removed = await this.catalogRepository.deleteCaseDataField(id, fieldName);

    if (removed === null) {
      throw new AppError(404, "NOT_FOUND", "Test case not found");
    }

    // Xoá field mà một bước FILL đang cần cũng làm 'ready' thành lời hứa sai, y như sửa steps.
    return this._demoteIfBroken(id);
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
      throw caseWriteError(err, data.tc_code);
    }
  }
  // 'ready' là lời hứa "bấm Run là chạy được". Kiểm trước khi hứa, thay vì để run fail giữa
  // đường với thông báo của runner — luật lấy từ chính nơi thi hành (runner/steps.js).
  async _assertRunnable(id) {
    const kase = await this.catalogRepository.findCaseDetails(id);
    if (!kase) throw new AppError(404, "NOT_FOUND", "Test case not found");

    if (!kase.steps.length) {
      throw new AppError(409, "NOT_RUNNABLE", "Case chưa có bước nào trong test_steps");
    }

    const have = new Set((kase.test_data || []).map((d) => d.field_name));
    const missing = requiredFields(kase.steps).filter((f) => !have.has(f));
    if (missing.length) {
      throw new AppError(
        409,
        "NOT_RUNNABLE",
        `Thiếu test_data cho field: ${missing.join(", ")}`,
      );
    }
  }
  async updateCase(id, data) {
    if (data.test_status === "ready") await this._assertRunnable(id);

    let testCase;
    try {
      testCase = await this.catalogRepository.updateCase(id, data);
    } catch (err) {
      throw caseWriteError(err, data.tc_code);
    }

    if (!testCase) {
      throw new AppError(404, "NOT_FOUND", "Test case not found");
    }

    return toApi(testCase);
  }
}

module.exports = CatalogService;
