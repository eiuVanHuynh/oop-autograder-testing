const TestRunner = require('./TestRunner');
const { runCase } = require('./steps');
const { toEvidenceRows } = require('../evidence');

// JPEG chứ không PNG: ảnh chỉ để người đọc nhìn, mà nó nằm trong Postgres nên mỗi KB đều tính.
// Đo trên ảnh thật 1280x720 của trang đăng nhập: PNG 74KB, JPEG q70 43KB (-42%), q50 34KB.
// q70 vì chữ trên nền phẳng vẫn sắc; thấp hơn nữa thì chữ đỏ trên toast lỗi bắt đầu nhoè.
const SCREENSHOT = { type: 'jpeg', quality: 70 };

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
    baseUrls, executablePath, publicApiUrl,
  }) {
    super({ baseUrls });
    // URL gốc của chính backend này, để link ảnh bằng chứng tải được từ trình duyệt.
    // Runner chạy ngoài request nên không suy ra được từ req như controller làm.
    this.publicApiUrl = publicApiUrl;
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
    void this._run(runId, ciRunId, { codes: testCodes || [], timeout, env }); // not awaited: runs in the background
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
      const resultId = await this._record(runId, code, result, log);
      // Ảnh phải chụp TRƯỚC khi page đóng ở finally — sau đó không còn gì để chụp.
      // Chỉ case không đạt: ảnh của case pass không ai mở, mà vẫn chiếm chỗ trong DB.
      if (resultId && result.status !== 'passed') {
        await this._captureScreenshot(page, resultId, code, log);
      }
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
  // Returns execution_id (null if nothing was written) because the evidence row hangs off it.
  async _record(runId, code, result, log) {
    try {
      const id = await this.resultRepository.recordForCode(runId, code, result);
      if (!id) await log('warn', `[PLAYWRIGHT] ${code} is not in test_cases — its result was not written.`);
      return id;
    } catch (err) {
      await log('error', `[PLAYWRIGHT] Could not write the result of ${code}: ${err.message}`);
      return null;
    }
  }

  // Ảnh chụp màn hình lúc case lỗi. Đây là bằng chứng DUY NHẤT của đường chạy local: reporter
  // của Playwright (automation/reporters) chỉ chạy trong GitHub Actions, không chạy ở đây.
  // Khung nhìn thôi, không fullPage: khớp với `screenshot: 'on'` của automation/playwright.config.js
  // và không bơm ảnh vài MB vào Postgres.
  //
  // Lỗi ở đây chỉ ghi log: mất một ảnh không được làm mất kết quả test vừa ghi.
  async _captureScreenshot(page, resultId, code, log) {
    try {
      const content = await page.screenshot(SCREENSHOT);
      const rows = toEvidenceRows(
        [{ type: 'screenshot', path: `${code}.jpg`, content, mime: 'image/jpeg' }],
        this.publicApiUrl,
      );
      await this.resultRepository.addEvidences(resultId, rows);
    } catch (err) {
      await log('warn', `[PLAYWRIGHT] Could not capture the screenshot of ${code}: ${err.message}`);
    }
  }
}

module.exports = PlaywrightRunner;
