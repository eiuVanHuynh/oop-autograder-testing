const AppError = require("../utils/AppError");
const { buildGrep } = require("./target");
const { ENVIRONMENTS } = require("../validators/options");
const parseJson = require("../utils/parseJson");

// Run tests, follow logs, history, cancel, rerun.
// Business rules live here. No pg require, no touching req/res.
// Takes every dependency through the constructor (wired in config/container.js) so tests can swap in fakes.

const RUN_STATUSES = ["running", "passed", "failed", "interrupted"];


class RunsService {
  constructor({
    runRepository,
    templateRepository,
    logRepository,
    targetResolver,
    testRunner,
    resultRepository,
  }) {
    Object.entries({
      runRepository,
      templateRepository,
      logRepository,
      targetResolver,
      testRunner,
      resultRepository,
    }).forEach(([name, dep]) => {
      if (!dep) throw new Error(`RunsService is missing a dependency: ${name}`);
    });
    this.runRepository = runRepository;
    this.templateRepository = templateRepository;
    this.logRepository = logRepository;
    this.targetResolver = targetResolver;
    this.testRunner = testRunner;
    this.resultRepository = resultRepository;
  }

  async getAllRuns(filters = {}) {
    if (filters.status && !RUN_STATUSES.includes(String(filters.status).toLowerCase())) {
      throw new AppError(400, "VALIDATION_ERROR", `status must be one of: ${RUN_STATUSES.join(", ")}`);
    }
    return this.runRepository.findAllWithFilters(filters);
  }

  async getRunById(id) {
    const run = await this.runRepository.findById(id);
    if (!run) throw new AppError(404, "NOT_FOUND", "Run not found");
    run.config_json = parseJson(run.config_json);
    return run;
  }

  // Per-case results of a run. No such run → 404 (not an empty list).
  async getRunResults(id) {
    await this.getRunById(id);
    return this.resultRepository.findByRun(id);
  }

  // Bằng chứng của một kết quả trong một lần chạy. Kết quả không thuộc run này → 404,
  // chứ không trả danh sách rỗng: nhầm resultId phải biết ngay, không phải tưởng là "chưa có ảnh".
  async getResultEvidences(runId, resultId) {
    await this.getRunById(runId);
    const rows = await this.resultRepository.findEvidences(runId, resultId);
    if (rows === null) throw new AppError(404, "NOT_FOUND", "This run has no such result");
    return rows;
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

    // What the user picked when pressing Run beats the template default.
    const env = data.env || template?.env || "development";

    // A template's env does NOT go through zod (it is an old value in the DB, possibly 'dev'), so
    // check the list here to keep the message identical whatever runner is plugged in.
    if (!ENVIRONMENTS.includes(env)) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        `Environment "${env}" is invalid; it must be one of: ${ENVIRONMENTS.join(", ")}`,
      );
    }

    // An environment must point at a real site. env used to be just a label: a run tagged
    // "production" still hit the old site. Block it here, BEFORE creating the test_runs row.
    const envProblem = this.testRunner.checkEnv(env);
    if (envProblem) throw new AppError(400, "VALIDATION_ERROR", envProblem);

    const timeout = data.timeout || template?.timeout || 30000;
    const grep = buildGrep(testCodes);

    const configJson = {
      templateId: data.templateId || null,
      testIds: data.testIds || null,
      // The resolved test codes, for the runner / GET /ingest/runs/:id/plan to reuse.
      // Never parse them back out of `grep`: grep is a string for GitHub Actions, not data.
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
      // GitHub Actions needs 1-3 minutes to queue, npm ci and install chromium before the CI reporter
      // writes its first line. Without this the log panel stays empty that whole time and reads as frozen.
      await this.logRepository
        .append(runId, 'info', `[BACKEND] Queued ${testCodes.length} test case(s); the runner takes 1-3 min to start.`)
        .catch(() => {});
    } catch (ciError) {
      console.error(`[runs] trigger failed for run ${runId}:`, ciError);
      // Đánh dấu thất bại là việc dọn dẹp: nó lỗi thì vẫn phải báo lỗi gốc, không phải lỗi dọn dẹp.
      await this.runRepository
        .markFinished(runId, "failed")
        .catch((err) => console.error(`[runs] markFinished failed for run ${runId}:`, err));
      // Thông báo của runner là chi tiết nội bộ (URL, phản hồi GitHub API) — log lại, đừng trả về client.
      throw new AppError(500, "RUNNER_FAILED", "Could not start the test runner", undefined, {
        cause: ciError,
      });
    }

    return this.getRunById(runId);
  }

  async cancelRun(id) {
    const run = await this.getRunById(id);
    if (run.status !== "running") {
      throw new AppError(409, "RUN_FINISHED", "Cannot cancel a run that has already finished");
    }

    // Cancelling on the runner side is best-effort: a failure there must not leave the run 'running' forever.
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

  // Log polling: return the lines with seq > after, plus the run status so the UI knows when to stop asking.
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
