const AppError = require("../utils/AppError");
const { buildGrep } = require("./target");

// Chạy test, theo dõi log, lịch sử, hủy, chạy lại.
// Running tests, log tailing, history, cancel, re-run.
// Quy tắc nghiệp vụ nằm ở đây. Không require pg, không chạm req/res.
// Nhận mọi phụ thuộc qua constructor (ráp ở config/container.js) để test thay bằng bản giả.

const RUN_STATUSES = ["running", "passed", "failed", "interrupted"];

const parseJson = (value) => {
  if (value == null) return null;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

class RunsService {
  constructor({
    runRepository,
    templateRepository,
    logRepository,
    targetResolver,
    testRunner,
  }) {
    Object.entries({
      runRepository,
      templateRepository,
      logRepository,
      targetResolver,
      testRunner,
    }).forEach(([name, dep]) => {
      if (!dep) throw new Error(`RunsService thiếu phụ thuộc: ${name}`);
    });
    this.runRepository = runRepository;
    this.templateRepository = templateRepository;
    this.logRepository = logRepository;
    this.targetResolver = targetResolver;
    this.testRunner = testRunner;
  }

  async getAllRuns(filters = {}) {
    if (filters.status && !RUN_STATUSES.includes(String(filters.status).toLowerCase())) {
      throw new AppError(400, "VALIDATION_ERROR", `status phải là một trong: ${RUN_STATUSES.join(", ")}`);
    }
    return this.runRepository.findAllWithFilters(filters);
  }

  async getRunById(id) {
    const run = await this.runRepository.findById(id);
    if (!run) throw new AppError(404, "NOT_FOUND", "Run not found");
    run.config_json = parseJson(run.config_json);
    return run;
  }

  async createRun(userId, data) {
    let template = null;
    let testCodes = [];
    let runName = data.run_name || `Run_${Date.now()}`;

    if (data.templateId) {
      template = await this.templateRepository.findById(data.templateId);
      if (!template) throw new AppError(404, "NOT_FOUND", "Template not found");
      runName = data.run_name || `Template_${template.template_name}_${Date.now()}`;
      testCodes = await this.targetResolver.resolveToTestCodes(parseJson(template.target_json));
    } else if (Array.isArray(data.testIds) && data.testIds.length > 0) {
      testCodes = await this.targetResolver.resolveExplicitTestCodes(data.testIds);
    }

    if (testCodes.length === 0) {
      throw new AppError(409, "NO_READY_TESTS", "No ready test cases found for this execution target");
    }

    // Giá trị người dùng chọn lúc bấm Run thắng mặc định của template.
    const env = data.env || template?.env || "development";
    const timeout = data.timeout || template?.timeout || 30000;
    const grep = buildGrep(testCodes);

    const configJson = {
      templateId: data.templateId || null,
      testIds: data.testIds || null,
      // Mã test đã giải ra, để bộ chạy / GET /ingest/runs/:id/plan dùng lại.
      // Không bao giờ parse ngược từ `grep`: grep là chuỗi cho GitHub Actions, không phải dữ liệu.
      testCodes,
      grep,
      env,
      timeout,
    };

    const runId = await this.runRepository.createRun({
      run_name: runName,
      user_id: userId,
      environment: env,
      config_json: JSON.stringify(configJson),
    });

    try {
      const ciRunId = await this.testRunner.trigger({ runId, testCodes, grep, env, timeout });
      if (ciRunId) await this.runRepository.setCiRunId(runId, ciRunId);
    } catch (ciError) {
      await this.runRepository.markFinished(runId, "failed");
      throw new AppError(500, "RUNNER_FAILED", `Failed to trigger test runner: ${ciError.message}`);
    }

    return this.getRunById(runId);
  }

  async cancelRun(id) {
    const run = await this.getRunById(id);
    if (run.status !== "running") {
      throw new AppError(409, "RUN_FINISHED", "Cannot cancel a run that has already finished");
    }

    // Hủy bên nơi chạy là best-effort: lỗi ở đó không được giữ run ở trạng thái 'running' mãi.
    try {
      await this.testRunner.cancel(run.ci_run_id);
    } catch (err) {
      console.warn(`[runs] cancel runner failed for run ${id}: ${err.message}`);
    }

    await this.runRepository.markFinished(id, "interrupted");
    return this.getRunById(id);
  }

  async rerun(id, userId) {
    const oldRun = await this.getRunById(id);
    const config = oldRun.config_json;
    if (!config) {
      throw new AppError(400, "VALIDATION_ERROR", "Run configuration metadata not found for rerun");
    }

    return this.createRun(userId, {
      templateId: config.templateId || undefined,
      testIds: config.testIds || undefined,
      env: config.env,
      timeout: config.timeout,
      run_name: `Rerun_${oldRun.run_name || id}`,
    });
  }

  // Polling log: trả các dòng có seq > after, kèm trạng thái run để giao diện biết khi nào dừng hỏi.
  async getRunLogs(id, after = 0) {
    const run = await this.getRunById(id);
    const rows = await this.logRepository.findAfter(id, after);
    const lines = rows.map((r) => ({ seq: Number(r.seq), level: r.level, message: r.message }));
    return {
      lines,
      nextAfter: lines.length ? lines[lines.length - 1].seq : after,
      status: run.status,
    };
  }
}

module.exports = RunsService;
