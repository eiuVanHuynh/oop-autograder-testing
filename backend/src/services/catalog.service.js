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
  //search steps 
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
  async addCaseStep(id, data) {
    const step = await this.catalogRepository.addCaseStep(id, data);

    if (!step) {
      throw new AppError(404, "NOT_FOUND", "Test case not found");
    }

    const demoted = await this._demoteIfBroken(id);

    return {
      ...toApi(step),
      ...(demoted ? { testStatus: "DRAFT", demotedReason: demoted } : {}),
    };
  }

  async deleteCaseStep(stepId) {
    const step = await this.catalogRepository.deleteCaseStep(stepId);

    if (!step) {
      throw new AppError(404, "NOT_FOUND", "Test step not found");
    }

    const demoted = await this._demoteIfBroken(step.test_id);

    return {
      deleted: true,
      ...(demoted ? { testStatus: "DRAFT", demotedReason: demoted } : {}),
    };
  }

  async reorderCaseSteps(id, steps) {
    const result = await this.catalogRepository.reorderCaseSteps(id, steps);

    if (result === null) {
      throw new AppError(404, "NOT_FOUND", "Test case not found");
    }

    if (result === false) {
      throw new AppError(400, "BAD_REQUEST", "Invalid steps reorder list");
    }
    const demoted = await this._demoteIfBroken(id);

    return {
      test_id: id,
      steps: result.map((step) => toApi(step)),
      ...(demoted ? { testStatus: "DRAFT", demotedReason: demoted } : {}),
    };
  }
  //search data 
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
  // Suite CRUD
  async getSuites() {
    return (await this.catalogRepository.findSuites()).map((r) => toApi(r));
  }
  async getSuiteById(id) {
    const suite = await this.catalogRepository.findSuiteById(id);

    if (!suite) {
      throw new AppError(404, "NOT_FOUND", "Suite not found");
    }

    return toApi(suite);
  }
  async createSuite(data) {
    try {
      const suite = await this.catalogRepository.createSuite(data);
      return toApi(suite);
    } catch (err) {
      if (err.code === "23505") {
        throw new AppError(
          409,
          "CONFLICT",
          `suite_name "${data.suite_name}" đã tồn tại`,
        );
      }

      throw err;
    }
  }

  async updateSuite(id, data) {
    try {
      const suite = await this.catalogRepository.updateSuite(id, data);

      if (!suite) {
        throw new AppError(404, "NOT_FOUND", "Suite not found");
      }

      return toApi(suite);
    } catch (err) {
      if (err instanceof AppError) throw err;

      if (err.code === "23505") {
        throw new AppError(
          409,
          "CONFLICT",
          `suite_name "${data.suite_name}" đã tồn tại`,
        );
      }

      throw err;
    }
  }

  async deleteSuite(id) {
    try {
      const result = await this.catalogRepository.deleteSuite(id);

      if (!result) {
        throw new AppError(404, "NOT_FOUND", "Suite not found");
      }

      if (!result.deleted) {
        throw new AppError(
          409,
          "CONFLICT",
          "Suite đang có Specification tham chiếu, không thể xóa",
        );
      }

      return { deleted: true };
    } catch (err) {
      if (err instanceof AppError) throw err;

      if (err.code === "23503") {
        throw new AppError(
          409,
          "CONFLICT",
          "Suite đang được dữ liệu khác tham chiếu, không thể xóa",
        );
      }

      throw err;
    }
  }
  async getSpecs(suiteId) {
    return (await this.catalogRepository.findSpecsBySuite(suiteId)).map((r) =>
      toApi(r),
    );
  }
  async createSpec(data) {
    try {
      const spec = await this.catalogRepository.createSpec(data);
      return toApi(spec);
    } catch (err) {
      if (err.code === "23505") {
        throw new AppError(
          409,
          "CONFLICT",
          `spec_code "${data.spec_code}" đã tồn tại`,
        );
      }

      if (err.code === "23503") {
        throw new AppError(
          400,
          "VALIDATION_ERROR",
          "suite_id không tồn tại",
        );
      }

      throw err;
    }
  }
  async updateSpec(id, data) {
    try {
      const spec = await this.catalogRepository.updateSpec(id, data);

      if (!spec) {
        throw new AppError(404, "NOT_FOUND", "Specification not found");
      }

      return toApi(spec);
    } catch (err) {
      if (err instanceof AppError) throw err;

      if (err.code === "23505") {
        throw new AppError(
          409,
          "CONFLICT",
          `spec_code "${data.spec_code}" đã tồn tại`,
        );
      }

      if (err.code === "23503") {
        throw new AppError(
          400,
          "VALIDATION_ERROR",
          "Dữ liệu tham chiếu không tồn tại",
        );
      }

      throw err;
    }
  }
  async deleteSpec(id) {
    try {
      const spec = await this.catalogRepository.deleteSpec(id);

      if (!spec) {
        throw new AppError(404, "NOT_FOUND", "Specification not found");
      }

      return { deleted: true };
    } catch (err) {
      if (err instanceof AppError) throw err;

      if (err.code === "23503") {
        throw new AppError(
          409,
          "CONFLICT",
          "Specification đang được Test Case tham chiếu, không thể xóa",
        );
      }

      throw err;
    }
  }
  //Testcase 
  async createCase(data) {
    try {
      const testCase = await this.catalogRepository.createCase(data);
      return toApi(testCase);
    } catch (err) {
      throw caseWriteError(err, data.tc_code);
    }
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
  async getCases(filters = {}) {
    const cases = await this.catalogRepository.findCases(filters);
    return cases.map((testCase) => toApi(testCase));
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
  async deleteCase(id) {
    try {
      const result = await this.catalogRepository.deleteCase(id);

      if (!result) {
        throw new AppError(404, "NOT_FOUND", "Test case not found");
      }

      if (!result.deleted) {
        throw new AppError(
          409,
          "CONFLICT",
          "Test case còn dữ liệu con, không thể xóa. Hãy chuyển test_status thành deprecated.",
        );
      }

      return result;
    } catch (err) {
      if (err instanceof AppError) throw err;

      // FK từ bảng khác vẫn tham chiếu đến testcase.
      if (err.code === "23503") {
        throw new AppError(
          409,
          "CONFLICT",
          "Test case đang được dữ liệu khác tham chiếu, không thể xóa",
        );
      }

      throw err;
    }
  }
  async updateCaseStatus(id, status) {
    const testCase = await this.catalogRepository.updateCase(id, {
      test_status: status,
    });

    if (!testCase) {
      const error = new Error("Test case not found");
      error.statusCode = 404;
      throw error;
    }

    return toApi(testCase);
  }

  async getCaseSteps(id) {
    const testCase = await this.catalogRepository.findCaseDetails(id);

    if (!testCase) {
      const error = new Error("Test case not found");
      error.statusCode = 404;
      throw error;
    }

    return (testCase.steps ?? []).map((step) => toApi(step));
  }

  async getCaseData(id) {
    const testCase = await this.catalogRepository.findCaseDetails(id);

    if (!testCase) {
      const error = new Error("Test case not found");
      error.statusCode = 404;
      throw error;
    }

    return (testCase.test_data ?? []).map((item) => toApi(item));
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
}

module.exports = CatalogService;
