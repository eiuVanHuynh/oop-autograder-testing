const AppError = require('../utils/AppError');

// Cửa sau cho máy: Playwright đẩy kết quả và log về.
// Machine-only door: Playwright pushes results and logs back.
// Quy tắc nghiệp vụ nằm ở đây. Không require pg, không chạm req/res.
//
// Luồng (backend-design.md mục 3): POST /runs tạo run rồi workflow_dispatch(runId, grep)
// → CI gọi GET plan → đẩy logs/results → PATCH finish. Backend tạo run, CI không tạo.
class IngestService {
  constructor({ runRepository, logRepository, resultRepository, catalogRepository }) {
    Object.entries({ runRepository, logRepository, resultRepository, catalogRepository })
      .forEach(([name, dep]) => {
        if (!dep) throw new Error(`IngestService thiếu phụ thuộc: ${name}`);
      });
    this.runRepository = runRepository;
    this.logRepository = logRepository;
    this.resultRepository = resultRepository;
    this.catalogRepository = catalogRepository;
  }

  async _getRun(runId) {
    const run = await this.runRepository.findById(runId);
    if (!run) throw new AppError(404, 'NOT_FOUND', 'Run not found');
    return run;
  }

  // Kế hoạch chạy: CI gọi đúng một lần rồi tự diễn giải các bước.
  // Không trả mật khẩu: data_value giữ nguyên dạng 'env:TEN_BIEN', CI đọc từ GitHub Secrets.
  async getPlan(runId) {
    const run = await this._getRun(runId);
    const config = typeof run.config_json === 'string' ? JSON.parse(run.config_json) : run.config_json;
    const codes = (config && config.testCodes) || [];
    if (!codes.length) {
      throw new AppError(409, 'NO_READY_TESTS', 'Run này không có mã test nào trong config_json');
    }

    const cases = await this.catalogRepository.findCasesByCodes(codes);
    return {
      runId: Number(runId),
      env: (config && config.env) || run.environment,
      timeout: (config && config.timeout) || 30000,
      cases,
    };
  }

  async addLogs(runId, lines) {
    await this._getRun(runId);
    const written = await this.logRepository.appendMany(runId, lines);
    return { written };
  }

  async addResults(runId, results) {
    const run = await this._getRun(runId);
    // Run đã đóng thì kết quả tới sau là dữ liệu mồ côi: status của run đã được tính xong rồi.
    if (run.finished_at) {
      throw new AppError(409, 'RUN_FINISHED', 'Run đã kết thúc, không nhận thêm kết quả');
    }
    return this.resultRepository.recordMany(runId, results);
  }

  // Chỉ ghi giờ kết thúc. final_status để trống để status của run được tính từ test_results;
  // chỉ truyền khi nơi chạy báo một kết cục mà test_results không nói lên được (vd bị hủy).
  async finish(runId, finalStatus = null) {
    await this._getRun(runId);
    const ok = await this.runRepository.markFinished(runId, finalStatus);
    if (!ok) throw new AppError(409, 'RUN_FINISHED', 'Run này đã được báo kết thúc trước đó');
    // Log chỉ lưu tạm cho khung log trực tiếp; chạy xong thì dọn (api-endpoints.md mục 8).
    await this.logRepository.purge(runId).catch(() => {});
    return this.runRepository.findById(runId);
  }

  // CI báo id lần chạy của GitHub Actions về, để POST /runs/:id/cancel hủy được.
  // workflow_dispatch không trả id nên đây là đường duy nhất backend biết nó.
  async setCiRunId(runId, ciRunId) {
    await this._getRun(runId);
    await this.runRepository.setCiRunId(runId, ciRunId);
    return { ciRunId };
  }
}

module.exports = IngestService;
