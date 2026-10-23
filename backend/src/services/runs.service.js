// Chạy test, theo dõi log, lịch sử, hủy, chạy lại.
// Running tests, log tailing, history, cancel, re-run.
// Quy tắc nghiệp vụ nằm ở đây. Không require pg, không chạm req/res.
// Business rules live here. Never require pg, never touch req/res.
// Nhận repository qua constructor để test thay được bằng bản giả.
// Takes its repositories through the constructor so tests can pass fakes.
//
// Cần làm / To do:
// - Chọn test: nhờ services/target/ (Strategy) đổi template thành danh sách tc_code → biểu thức grep.
// - Gọi CI qua services/runner/ (Adapter), không require thẳng GitHub API ở đây.
// - Không ra test 'ready' nào → 409, KHÔNG gọi workflow (tránh báo passed giả).
// - Lưu grep vào test_runs.config_json; 'Chạy lại' gửi lại y nguyên config_json cũ.
// - Hủy: gọi runner.cancel(ci_run_id), ghi kết quả dở thành 'interrupted'.

class RunsService {
  constructor(deps = {}) {
    this.runRepository = deps.runRepository;
    this.templateRepository = deps.templateRepository;
    this.targetResolver = deps.targetResolver; // Strategy chuyển target_json thành danh sách test & grep
    this.testRunner = deps.testRunner; // Adapter gọi CI / Playwright runner
  }

  async getAllRuns(filters = {}) {
    return await this.runRepository.findAllWithFilters(filters);
  }

  async getRunById(id) {
    const run = await this.runRepository.findById(id);
    if (!run) {
      const error = new Error("Run not found");
      error.statusCode = 404;
      throw error;
    }
    if (typeof run.config_json === "string") {
      run.config_json = JSON.parse(run.config_json);
    }
    return run;
  }

  async createRun(userId, data) {
    let testCodes = [];
    let templateId = data.templateId;
    let configEnv = data.env || "development";
    let configTimeout = data.timeout || 30000;
    let runName = data.run_name || `Run_${Date.now()}`;

    // 1. Xác định danh sách test từ templateId hoặc testIds
    if (templateId) {
      const template = await this.templateRepository.findById(templateId);
      if (!template) {
        const error = new Error("Template not found");
        error.statusCode = 404;
        throw error;
      }
      configEnv = template.env || configEnv;
      configTimeout = template.timeout || configTimeout;
      runName = `Template_${template.template_name}_${Date.now()}`;

      // Dùng targetResolver (Strategy) để lấy danh sách tc_code 'ready'
      let targetJson =
        typeof template.target_json === "string"
          ? JSON.parse(template.target_json)
          : template.target_json;

      testCodes = await this.targetResolver.resolveToTestCodes(targetJson);
    } else if (data.testIds && data.testIds.length > 0) {
      testCodes = await this.targetResolver.resolveExplicitTestCodes(
        data.testIds,
      );
    }

    // 2. Không ra test 'ready' nào → 409, KHÔNG gọi workflow (tránh báo passed giả)
    if (!testCodes || testCodes.length === 0) {
      const error = new Error(
        "No ready test cases found for this execution target",
      );
      error.statusCode = 409;
      throw error;
    }

    // 3. Tạo biểu thức --grep từ danh sách test codes
    const grepExpression = testCodes.join("|");
    const configJson = {
      templateId: templateId || null,
      testIds: data.testIds || null,
      grep: grepExpression,
      env: configEnv,
      timeout: configTimeout,
    };

    // 4. Tạo bản ghi lần chạy ở trạng thái 'pending' hoặc 'running'
    const runId = await this.runRepository.createRun({
      run_name: runName,
      status: "running",
      user_id: userId,
      config_json: JSON.stringify(configJson),
    });

    // 5. Gọi CI qua testRunner (Adapter), truyền grep và thông tin chạy
    try {
      if (this.testRunner && typeof this.testRunner.trigger === "function") {
        await this.testRunner.trigger({
          runId,
          grep: grepExpression,
          env: configEnv,
          timeout: configTimeout,
        });
      }
    } catch (ciError) {
      // Nếu trigger CI thất bại, cập nhật trạng thái run thành failed
      await this.runRepository.updateStatus(runId, "failed");
      const error = new Error(
        `Failed to trigger test runner: ${ciError.message}`,
      );
      error.statusCode = 500;
      throw error;
    }

    return await this.getRunById(runId);
  }

  async cancelRun(id, userId) {
    const run = await this.getRunById(id);

    // Test đã chạy xong (completed/failed/interrupted) thì không hủy được -> 409
    if (["completed", "failed", "interrupted", "passed"].includes(run.status)) {
      const error = new Error("Cannot cancel a run that has already finished");
      error.statusCode = 409;
      throw error;
    }

    // Gọi runner hủy quá trình CI nếu có ci_run_id hoặc qua adapter
    if (this.testRunner && typeof this.testRunner.cancel === "function") {
      await this.testRunner.cancel(run.ci_run_id || id);
    }

    // Ghi kết quả dở thành 'interrupted'
    await this.runRepository.updateStatus(id, "interrupted");
    return await this.getRunById(id);
  }

  async rerun(id, userId) {
    const oldRun = await this.getRunById(id);
    const config = oldRun.config_json;

    if (!config) {
      const error = new Error("Run configuration metadata not found for rerun");
      error.statusCode = 400;
      throw error;
    }

    // 'Chạy lại' gửi lại y nguyên config_json cũ
    return await this.createRun(userId, {
      templateId: config.templateId,
      testIds: config.testIds,
      env: config.env,
      timeout: config.timeout,
      run_name: `Rerun_${oldRun.run_name || id}`,
    });
  }
}

module.exports = RunsService;
