const AppError = require("../utils/AppError");
const { toApi } = require("../utils/mappers");

// Báo lỗi từ một kết quả test bị Fail (🟡).
// Bug reports raised from a failed test result (🟡).
// Quy tắc nghiệp vụ nằm ở đây. Không require pg, không chạm req/res.

// Chỉ kết quả Fail mới báo lỗi được: một bug gắn vào test đã Đạt là dữ liệu tự mâu thuẫn.
const FAILED_STATUSES = ["failed", "timedOut"];

class BugsService {
  constructor({ bugRepository, resultRepository }) {
    Object.entries({ bugRepository, resultRepository }).forEach(([name, dep]) => {
      if (!dep) throw new Error(`BugsService thiếu phụ thuộc: ${name}`);
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
        `Kết quả này là "${result.result_status}", chỉ báo lỗi được từ kết quả Fail`,
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
