const AppError = require("../utils/AppError");
const { toApi } = require("../utils/mappers");

// Report a bug from a failed test result (🟡).
// Business rules live here. No pg require, no touching req/res.

// Only a failed result can produce a bug: a bug attached to a passing test is self-contradictory data.
const FAILED_STATUSES = ["failed", "timedOut"];

class BugsService {
  constructor({ bugRepository, resultRepository }) {
    Object.entries({ bugRepository, resultRepository }).forEach(([name, dep]) => {
      if (!dep) throw new Error(`BugsService is missing a dependency: ${name}`);
    });
    this.bugRepository = bugRepository;
    this.resultRepository = resultRepository;
  }

  async createForResult(resultId, data, userId) {
    const result = await this.resultRepository.findById(resultId);
    if (!result) throw new AppError(404, "NOT_FOUND", "Test result not found");

    if (!FAILED_STATUSES.includes(result.result_status)) {
      throw new AppError(
        409,
        "RESULT_NOT_FAILED",
        `This result is "${result.result_status}"; a bug can only be reported from a Fail result`,
      );
    }

    return toApi(
      await this.bugRepository.createBug({
        result_id: resultId,
        title: data.title,
        description: data.description,
        severity: data.severity,
        created_by: userId,
      }),
    );
  }

  async getBugs(filters = {}) {
    return (await this.bugRepository.findAllWithFilters(filters)).map((row) => toApi(row));
  }

  async updateBug(id, data) {
    const bug = await this.bugRepository.updateBug(id, data);
    if (!bug) throw new AppError(404, "NOT_FOUND", "Bug not found");
    return toApi(bug);
  }
}

module.exports = BugsService;
