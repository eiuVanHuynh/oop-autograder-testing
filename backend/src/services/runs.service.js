// Chạy test, theo dõi log, lịch sử, hủy, chạy lại.
// Running tests, log tailing, history, cancel, re-run.
// Quy tắc nghiệp vụ nằm ở đây. Không require pg, không chạm req/res.

const RunRepository = require("../repositories/RunRepository");
const TemplateRepository = require("../repositories/TemplateRepository");

class RunsService {
  constructor(deps = {}) {
    this.runRepository = deps.runRepository || new RunRepository();
    this.templateRepository =
      deps.templateRepository || new TemplateRepository();
    this.targetResolver = deps.targetResolver;
    this.testRunner = deps.testRunner;
  }

  async getAllRuns(filters = {}) {
    return await this.runRepository.findAllWithFilters(filters);
  }

  async getRuns(filters = {}) {
    return await this.getAllRuns(filters);
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

      let targetJson =
        typeof template.target_json === "string"
          ? JSON.parse(template.target_json)
          : template.target_json;

      if (
        this.targetResolver &&
        typeof this.targetResolver.resolveToTestCodes === "function"
      ) {
        testCodes = await this.targetResolver.resolveToTestCodes(targetJson);
      }
    } else if (data.testIds && data.testIds.length > 0) {
      if (
        this.targetResolver &&
        typeof this.targetResolver.resolveExplicitTestCodes === "function"
      ) {
        testCodes = await this.targetResolver.resolveExplicitTestCodes(
          data.testIds,
        );
      } else {
        testCodes = data.testIds;
      }
    }

    if (!testCodes || testCodes.length === 0) {
      const error = new Error(
        "No ready test cases found for this execution target",
      );
      error.statusCode = 409;
      throw error;
    }

    const grepExpression = testCodes.join("|");
    const configJson = {
      templateId: templateId || null,
      testIds: data.testIds || null,
      grep: grepExpression,
      env: configEnv,
      timeout: configTimeout,
    };

    const runId = await this.runRepository.createRun({
      run_name: runName,
      status: "running",
      user_id: userId,
      config_json: JSON.stringify(configJson),
    });

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

    if (["completed", "failed", "interrupted", "passed"].includes(run.status)) {
      const error = new Error("Cannot cancel a run that has already finished");
      error.statusCode = 409;
      throw error;
    }

    if (this.testRunner && typeof this.testRunner.cancel === "function") {
      await this.testRunner.cancel(run.ci_run_id || id);
    }

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

    return await this.createRun(userId, {
      templateId: config.templateId,
      testIds: config.testIds,
      env: config.env,
      timeout: config.timeout,
      run_name: `Rerun_${oldRun.run_name || id}`,
    });
  }
}

module.exports = new RunsService();
