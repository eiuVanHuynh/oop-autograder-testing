const { toApi } = require("../utils/mappers");
const AppError = require("../utils/AppError");
const { requiredFields } = require("./runner/steps");
// Suite / spec / case – where tests are declared, the source for picking a target.
// Business rules live here. No pg require, no touching req/res.
// Takes repositories through the constructor so tests can swap in fakes.
//
// To do:
// - Only test_status = 'ready' may run; draft and deprecated are skipped.
// - Also the source for the loadTestCase(tcCode) helper under automation/.
// Turn a test_cases constraint error into an API error. Used by both create and update.
const caseWriteError = (err, tcCode) => {
  if (err.code === "23505")
    // UNIQUE: tc_code (or automation_ref)
    return new AppError(409, "CONFLICT", `tc_code "${tcCode}" already exists`);
  if (err.code === "23503")
    // FK: spec_id does not exist
    return new AppError(400, "VALIDATION_ERROR", "spec_id does not exist");
  return err;
};

class CatalogService {
  constructor(deps = {}) {
    this.catalogRepository = deps.catalogRepository;
    // TODO: take the repositories it needs from config/container.js
  }
  // Editing steps/data can make a case that IS 'ready' unrunnable (all steps removed, a field a FILL
  // step needs dropped). Blocking the edit means a ready case can never be edited; leaving it alone makes
  // 'ready' a false promise and the run fails midway. So: drop it back to 'draft' and SAY SO.
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

    // Dropping a field a FILL step needs also makes 'ready' a false promise, exactly like editing steps.
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
          `suite_name "${data.suite_name}" already exists`,
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
          `suite_name "${data.suite_name}" already exists`,
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
          "The suite is referenced by a Specification and cannot be deleted",
        );
      }

      return { deleted: true };
    } catch (err) {
      if (err instanceof AppError) throw err;

      if (err.code === "23503") {
        throw new AppError(
          409,
          "CONFLICT",
          "The suite is referenced by other data and cannot be deleted",
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
          `spec_code "${data.spec_code}" already exists`,
        );
      }

      if (err.code === "23503") {
        throw new AppError(
          400,
          "VALIDATION_ERROR",
          "suite_id does not exist",
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
          `spec_code "${data.spec_code}" already exists`,
        );
      }

      if (err.code === "23503") {
        throw new AppError(
          400,
          "VALIDATION_ERROR",
          "The referenced data does not exist",
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
          "The specification is referenced by a Test Case and cannot be deleted",
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
      throw new AppError(404, "NOT_FOUND", "Test case not found");
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
          "The test case still has child data and cannot be deleted. Set test_status to deprecated instead.",
        );
      }

      return result;
    } catch (err) {
      if (err instanceof AppError) throw err;

      // An FK from another table still references the test case.
      if (err.code === "23503") {
        throw new AppError(
          409,
          "CONFLICT",
          "The test case is referenced by other data and cannot be deleted",
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
      throw new AppError(404, "NOT_FOUND", "Test case not found");
    }

    return toApi(testCase);
  }

  async getCaseSteps(id) {
    const testCase = await this.catalogRepository.findCaseDetails(id);

    if (!testCase) {
      throw new AppError(404, "NOT_FOUND", "Test case not found");
    }

    return (testCase.steps ?? []).map((step) => toApi(step));
  }

  async getCaseData(id) {
    const testCase = await this.catalogRepository.findCaseDetails(id);

    if (!testCase) {
      throw new AppError(404, "NOT_FOUND", "Test case not found");
    }

    return (testCase.test_data ?? []).map((item) => toApi(item));
  }
  // 'ready' is the promise "press Run and it works". Check before promising, instead of letting the run fail
  // midway with the runner's own message — the rules come from the enforcer itself (runner/steps.js).
  async _assertRunnable(id) {
    const kase = await this.catalogRepository.findCaseDetails(id);
    if (!kase) throw new AppError(404, "NOT_FOUND", "Test case not found");

    if (!kase.steps.length) {
      throw new AppError(409, "NOT_RUNNABLE", "The case has no steps in test_steps yet");
    }

    const have = new Set((kase.test_data || []).map((d) => d.field_name));
    const missing = requiredFields(kase.steps).filter((f) => !have.has(f));
    if (missing.length) {
      throw new AppError(
        409,
        "NOT_RUNNABLE",
        `Missing test_data for field: ${missing.join(", ")}`,
      );
    }
  }
}

module.exports = CatalogService;
