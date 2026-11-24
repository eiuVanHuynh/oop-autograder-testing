const TestRunner = require('./TestRunner');
const { runCase } = require('./steps');

// Runs tests with Playwright inside the backend process — LOCAL USE ONLY.
//
// Production goes through GitHub Actions (backend-design.md section 3): Vercel is serverless, has no
// chromium binary, and kills the process right after the response, so background work here would be cut off.
// This class exists to try a real run on your own machine without waiting for CI.
//
// Step interpretation lives in ./steps.js, shared with the CI spec — one step language,
// one implementation. This class only handles: open the browser, loop over cases, write test_results + logs.
class PlaywrightRunner extends TestRunner {
  constructor({
    logRepository, runRepository, resultRepository, catalogRepository,
    baseUrls, executablePath,
  }) {
    super({ baseUrls });
    this.logRepository = logRepository;
    this.runRepository = runRepository;
    this.resultRepository = resultRepository;
    this.catalogRepository = catalogRepository;
    this.executablePath = executablePath || '/usr/bin/chromium';
    this.sessions = new Map(); // ciRunId -> { browser }
    this.cancelled = new Set();
  }

  // Which site is hit is decided by the run's env, not by a fixed BASE_URL.
  checkEnv(env) {
    return this.requireBaseUrl(env);
  }

  // testCodes are resolved by runs.service from the template/suite — never parsed back out of the grep expression.
  async trigger({ runId, testCodes, timeout, env }) {
    const ciRunId = `pw-${runId}`;
    this._run(runId, ciRunId, { codes: testCodes || [], timeout, env }); // not awaited: runs in the background
    return ciRunId;
  }

  async cancel(ciRunId) {
    if (!ciRunId) return;
    this.cancelled.add(String(ciRunId));
    const s = this.sessions.get(String(ciRunId));
    if (s && s.browser) await s.browser.close().catch(() => {});
  }

  async _run(runId, ciRunId, { codes, timeout, env }) {
    const log = (level, msg) => this.logRepository.append(runId, level, msg).catch(() => {});
    const baseUrl = this.baseUrlFor(env);
    if (!baseUrl) {
      // runs.service already blocked this (400); we only get here if the config changed between the two steps.
      await log('error', `[PLAYWRIGHT] ${this.requireBaseUrl(env)}`);
      await this.runRepository.markFinished(runId, 'failed');
      return;
    }

    await log('info', `[PLAYWRIGHT] ${codes.length} test cases on ${baseUrl} (${env}): ${codes.join(', ')}`);

    let browser;
    try {
      const { chromium } = require('playwright');
      browser = await chromium.launch({ executablePath: this.executablePath, headless: true });
      this.sessions.set(ciRunId, { browser });

      for (const code of codes) {
        if (this.cancelled.has(ciRunId)) {
          await log('warn', '[PLAYWRIGHT] Cancelled, skipping the remaining test cases.');
          await this.runRepository.markFinished(runId, 'interrupted'); // after the log: see _run's note
          return;
        }
        await this._runCase(browser, runId, code, timeout, log, baseUrl);
      }

      // The last log line goes in BEFORE the run is closed: the live panel stops polling as soon as
      // GET /runs/:id/logs reports a status other than 'running', so anything logged after
      // markFinished never reaches the screen (issue #79).
      await log('info', '[PLAYWRIGHT] Finished.');
      // final_status left empty: the run status is computed from test_results.
      await this.runRepository.markFinished(runId, null);
    } catch (err) {
      // An infrastructure error (browser would not start…), not a failing test.
      await log('error', `[PLAYWRIGHT] Runner error: ${err.message}`);
      await this.runRepository.markFinished(runId, 'failed'); // after the log: see the note above
    } finally {
      this.sessions.delete(ciRunId);
      if (browser) await browser.close().catch(() => {});
    }
  }

  // One case = one fresh page (no login session carried into the next case) + one test_results row.
  async _runCase(browser, runId, code, timeout, log, baseUrl) {
    const page = await browser.newPage({ baseURL: baseUrl });
    page.setDefaultTimeout(Number(timeout) || 30000);
    try {
      const kase = (await this.catalogRepository.findCaseByCode(code)) || { steps: [], data: {} };
      await log('info', `[PLAYWRIGHT] ${code}: ${kase.steps.length} steps`);
      const result = await runCase(page, kase, log);
      await this._record(runId, code, result, log);
      await log(result.status === 'passed' ? 'info' : 'error',
        `[PLAYWRIGHT] ${code} ${result.status} (${result.ms}ms)${result.error ? ': ' + result.error : ''}`);
    } catch (err) {
      // A DB read failure: record this case as failed rather than bringing the whole run down.
      await this._record(runId, code, { status: 'failed', ms: 0, error: err.message }, log);
    } finally {
      await page.close().catch(() => {});
    }
  }

  // Writing test_results is the part that must not be lost: an error here goes to the log, it does not kill the run.
  async _record(runId, code, result, log) {
    try {
      const id = await this.resultRepository.recordForCode(runId, code, result);
      if (!id) await log('warn', `[PLAYWRIGHT] ${code} is not in test_cases — its result was not written.`);
    } catch (err) {
      await log('error', `[PLAYWRIGHT] Could not write the result of ${code}: ${err.message}`);
    }
  }
}

module.exports = PlaywrightRunner;
