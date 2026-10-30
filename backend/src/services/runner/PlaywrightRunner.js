const TestRunner = require('./TestRunner');
const { runCase } = require('./steps');

// Chạy test bằng Playwright ngay trong tiến trình backend — CHỈ DÙNG LOCAL.
// Runs Playwright in the backend process — LOCAL DEV ONLY.
//
// Production đi đường GitHub Actions (backend-design.md mục 3): Vercel là serverless, không có
// binary chromium, đóng tiến trình ngay sau khi trả response nên việc chạy nền ở đây sẽ bị cắt.
// Lớp này tồn tại để chạy thử một run thật trên máy mình mà không cần đợi CI.
//
// Phần diễn giải bước nằm ở ./steps.js, dùng chung với spec trong CI — một ngôn ngữ bước,
// một bản cài đặt. Lớp này chỉ lo: mở browser, lặp qua các case, ghi test_results + log.
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

  // Chạy web nào là do env của run quyết định, không phải một BASE_URL cố định.
  checkEnv(env) {
    return this.requireBaseUrl(env);
  }

  // testCodes do runs.service giải ra từ template/suite — không parse lại từ biểu thức grep.
  async trigger({ runId, testCodes, timeout, env }) {
    const ciRunId = `pw-${runId}`;
    this._run(runId, ciRunId, { codes: testCodes || [], timeout, env }); // không await: chạy nền
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
      // runs.service đã chặn từ trước (400); tới đây chỉ khi cấu hình đổi giữa hai bước.
      await log('error', `[PLAYWRIGHT] ${this.requireBaseUrl(env)}`);
      await this.runRepository.markFinished(runId, 'failed');
      return;
    }

    await log('info', `[PLAYWRIGHT] ${codes.length} test case trên ${baseUrl} (${env}): ${codes.join(', ')}`);

    let browser;
    try {
      const { chromium } = require('playwright');
      browser = await chromium.launch({ executablePath: this.executablePath, headless: true });
      this.sessions.set(ciRunId, { browser });

      for (const code of codes) {
        if (this.cancelled.has(ciRunId)) {
          await log('warn', '[PLAYWRIGHT] Đã hủy, bỏ các test case còn lại.');
          await this.runRepository.markFinished(runId, 'interrupted');
          return;
        }
        await this._runCase(browser, runId, code, timeout, log, baseUrl);
      }

      // final_status để trống: status của run được tính từ test_results.
      await this.runRepository.markFinished(runId, null);
      await log('info', '[PLAYWRIGHT] Chạy xong.');
    } catch (err) {
      // Lỗi hạ tầng (không mở được browser…), không phải một test fail.
      await log('error', `[PLAYWRIGHT] Lỗi bộ chạy: ${err.message}`);
      await this.runRepository.markFinished(runId, 'failed');
    } finally {
      this.sessions.delete(ciRunId);
      if (browser) await browser.close().catch(() => {});
    }
  }

  // Một case = một page mới (không mang session đăng nhập sang case sau) + một dòng test_results.
  async _runCase(browser, runId, code, timeout, log, baseUrl) {
    const page = await browser.newPage({ baseURL: baseUrl });
    page.setDefaultTimeout(Number(timeout) || 30000);
    try {
      const kase = (await this.catalogRepository.findCaseByCode(code)) || { steps: [], data: {} };
      await log('info', `[PLAYWRIGHT] ${code}: ${kase.steps.length} bước`);
      const result = await runCase(page, kase, log);
      await this._record(runId, code, result, log);
      await log(result.status === 'passed' ? 'info' : 'error',
        `[PLAYWRIGHT] ${code} ${result.status} (${result.ms}ms)${result.error ? ': ' + result.error : ''}`);
    } catch (err) {
      // Đọc DB lỗi: ghi nhận case này fail chứ không làm sập cả run.
      await this._record(runId, code, { status: 'failed', ms: 0, error: err.message }, log);
    } finally {
      await page.close().catch(() => {});
    }
  }

  // Ghi test_results là phần không được mất: lỗi ở đây phải vào log, không làm chết run.
  async _record(runId, code, result, log) {
    try {
      const id = await this.resultRepository.recordForCode(runId, code, result);
      if (!id) await log('warn', `[PLAYWRIGHT] ${code} không có trong test_cases — kết quả không được ghi.`);
    } catch (err) {
      await log('error', `[PLAYWRIGHT] Không ghi được kết quả ${code}: ${err.message}`);
    }
  }
}

module.exports = PlaywrightRunner;
