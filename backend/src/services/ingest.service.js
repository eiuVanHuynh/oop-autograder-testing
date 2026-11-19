const AppError = require('../utils/AppError');

// Back door for machines: Playwright pushes results and logs back.
// Business rules live here. No pg require, no touching req/res.
//
// The flow (backend-design.md section 3): POST /runs creates the run, then workflow_dispatch(runId, grep)
// → CI calls GET plan → pushes logs/results → PATCH finish. The backend creates the run, CI never does.
class IngestService {
  constructor({ runRepository, logRepository, resultRepository, catalogRepository }) {
    Object.entries({ runRepository, logRepository, resultRepository, catalogRepository })
      .forEach(([name, dep]) => {
        if (!dep) throw new Error(`IngestService is missing a dependency: ${name}`);
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

  // The run plan: CI calls it exactly once and then interprets the steps itself.
  // No passwords returned: data_value stays in 'env:VAR_NAME' form, CI reads it from GitHub Secrets.
  async getPlan(runId) {
    const run = await this._getRun(runId);
    const config = typeof run.config_json === 'string' ? JSON.parse(run.config_json) : run.config_json;
    const codes = (config && config.testCodes) || [];
    if (!codes.length) {
      throw new AppError(409, 'NO_READY_TESTS', 'This run has no test code in config_json');
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
    // Once a run is closed, a late result is orphan data: the run's status has already been computed.
    if (run.finished_at) {
      throw new AppError(409, 'RUN_FINISHED', 'The run has ended and accepts no more results');
    }
    return this.resultRepository.recordMany(runId, results);
  }

  // Only writes the finish time. final_status is left empty so the run status is computed from test_results;
  // pass it only when the runner reports an outcome test_results cannot express (e.g. cancelled).
  async finish(runId, finalStatus = null) {
    await this._getRun(runId);
    const ok = await this.runRepository.markFinished(runId, finalStatus);
    if (!ok) throw new AppError(409, 'RUN_FINISHED', 'This run was already reported as finished');
    // Logs are only kept for the live log panel; purge them once the run ends (api-endpoints.md section 8).
    await this.logRepository.purge(runId).catch(() => {});
    return this.runRepository.findById(runId);
  }

  // CI reports the GitHub Actions run id back so POST /runs/:id/cancel can cancel it.
  // workflow_dispatch returns no id, so this is the only way the backend learns it.
  async setCiRunId(runId, ciRunId) {
    await this._getRun(runId);
    await this.runRepository.setCiRunId(runId, ciRunId);
    return { ciRunId };
  }
}

module.exports = IngestService;
