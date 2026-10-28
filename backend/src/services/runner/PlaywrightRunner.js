const TestRunner = require('./TestRunner');

// Bản chạy THẬT bằng Playwright, ngay trong tiến trình backend (local-first).
// Real runner using Playwright, in-process (local-first).
//
// - trigger() khởi chạy chromium, mở BASE_URL + chạy các bước của 1 test case rồi
//   đóng run bằng runRepository.markFinished (giống FakeRunner, không chặn request).
// - Dữ liệu bước: lấy từ Postgres nếu có (loadCase), không có → mock TC-01 login.
// - Dùng chromium sẵn trên máy qua executablePath (mặc định /usr/bin/chromium) để
//   không phải tải browser của Playwright.

// placeholder=... | text=... | role=... | css=... (mặc định coi như CSS selector)
function toLocator(page, target) {
  const m = /^(placeholder|text|role|css)=([\s\S]+)$/.exec(target || '');
  if (!m) return page.locator(target);
  const [, kind, value] = m;
  if (kind === 'placeholder') return page.getByPlaceholder(value);
  if (kind === 'text') return page.getByText(value, { exact: false });
  if (kind === 'role') return page.getByRole(value);
  return page.locator(value);
}

// shortcut: FILL không gắn field trong schema, nên đoán theo placeholder chứa "password".
// Nâng cấp khi test_steps có cột field_name trỏ thẳng test_data.
function fillValueFor(target, creds) {
  return /password/i.test(target || '') ? creds.password : creds.username;
}

// Mock TC-01: đăng nhập IRN + mật khẩu. Dùng khi Postgres chưa có bước cho TC.
function mockCase(creds) {
  return {
    steps: [
      { step_order: 1, action: 'NAVIGATE', target: '/login' },
      { step_order: 2, action: 'FILL', target: 'placeholder=e.g. 20521234' },
      { step_order: 3, action: 'FILL', target: 'placeholder=Enter your password' },
      { step_order: 4, action: 'CLICK', target: 'text=Sign In' },
      { step_order: 5, action: 'VERIFY', target: null }, // không còn ở /login
    ],
    creds,
    source: 'mock',
  };
}

class PlaywrightRunner extends TestRunner {
  constructor({ logRepository, runRepository, query, baseUrl, username, password, executablePath }) {
    super();
    this.logRepository = logRepository;
    this.runRepository = runRepository;
    this.query = query; // config/db.js query, best-effort đọc steps từ Postgres
    this.baseUrl = baseUrl;
    this.creds = {
      username: username || '20521234',
      password: password || 'password',
    };
    this.executablePath = executablePath || '/usr/bin/chromium';
    this.sessions = new Map(); // ciRunId -> { browser }
    this.cancelled = new Set();
    console.log("Playwright called & created!")
  }

  async trigger({ runId, grep, timeout }) {
    const tcCode = (String(grep || '').match(/TC-\d+/) || [])[0] || null;
    const ciRunId = `pw-${runId}`;
    this._run(runId, ciRunId, { tcCode, timeout }); // không await: chạy nền như FakeRunner
    return ciRunId;
  }

  async cancel(ciRunId) {
    if (!ciRunId) return;
    this.cancelled.add(String(ciRunId));
    const s = this.sessions.get(String(ciRunId));
    if (s && s.browser) await s.browser.close().catch(() => {});
  }

  async _run(runId, ciRunId, { tcCode, timeout }) {
    const log = (level, msg) => this.logRepository.append(runId, level, msg).catch(() => {});
    if (!this.baseUrl) {
      await log('error', '[PLAYWRIGHT] Thiếu BASE_URL — không biết chạy trên web nào.');
      await this.runRepository.markFinished(runId, 'failed');
      return;
    }

    const kase = await this._loadCase(tcCode);
    await log('info', `[PLAYWRIGHT] ${tcCode || 'TC-01'} nguồn=${kase.source}, target=${this.baseUrl}`);

    let browser;
    try {
      const { chromium } = require('playwright');
      browser = await chromium.launch({ executablePath: this.executablePath, headless: true });
      this.sessions.set(ciRunId, { browser });
      const page = await browser.newPage({ baseURL: this.baseUrl });
      page.setDefaultTimeout(Number(timeout) || 30000);

      for (const step of kase.steps.slice().sort((a, b) => a.step_order - b.step_order)) {
        if (this.cancelled.has(ciRunId)) {
          await log('warn', '[PLAYWRIGHT] Đã hủy.');
          await this.runRepository.markFinished(runId, 'interrupted');
          return;
        }
        await this._step(page, step, kase.creds, log);
      }

      await this.runRepository.markFinished(runId, 'passed');
      await log('info', '[PLAYWRIGHT] PASSED.');
    } catch (err) {
      await log('error', `[PLAYWRIGHT] FAILED: ${err.message}`);
      await this.runRepository.markFinished(runId, 'failed');
    } finally {
      this.sessions.delete(ciRunId);
      if (browser) await browser.close().catch(() => {});
    }
  }

  async _step(page, step, creds, log) {
    const { action, target } = step;
    switch (action) {
      case 'NAVIGATE':
        await page.goto(target);
        await log('info', `NAVIGATE ${target}`);
        break;
      case 'FILL':
        await toLocator(page, target).fill(fillValueFor(target, creds));
        await log('info', `FILL ${target}`);
        break;
      case 'CLICK':
        await toLocator(page, target).click();
        await log('info', `CLICK ${target}`);
        break;
      case 'VERIFY':
        if (target) {
          await toLocator(page, target).waitFor({ state: 'visible' });
          await log('info', `VERIFY visible ${target}`);
        } else {
          // Đăng nhập thành công = rời khỏi /login.
          await page.waitForLoadState('networkidle').catch(() => {});
          if (/\/login\b/.test(page.url())) {
            throw new Error(`vẫn ở trang login (${page.url()}) — đăng nhập không thành công`);
          }
          await log('info', `VERIFY redirected -> ${page.url()}`);
        }
        break;
      default:
        await log('warn', `Bỏ qua action lạ: ${action}`);
    }
  }

  // Đọc bước từ Postgres nếu có; lỗi/không có → mock. (data có thì dùng, không thì mock)
  async _loadCase(tcCode) {
    if (!this.query || !tcCode) return mockCase(this.creds);
    try {
      const steps = (await this.query(
        `SELECT ts.step_order, ts.action, ts.target
           FROM test_steps ts JOIN test_cases tc ON ts.test_id = tc.test_id
          WHERE tc.tc_code = $1 ORDER BY ts.step_order`,
        [tcCode],
      )).rows;
      if (!steps.length) return mockCase(this.creds);

      const data = (await this.query(
        `SELECT td.field_name, td.data_value
           FROM test_data td JOIN test_cases tc ON td.test_id = tc.test_id
          WHERE tc.tc_code = $1`,
        [tcCode],
      )).rows;
      const byField = Object.fromEntries(data.map((r) => [r.field_name, r.data_value]));
      const creds = {
        username: this.creds.username !== '20521234' ? this.creds.username : byField.username || this.creds.username,
        password: this.creds.password !== 'password' ? this.creds.password : byField.password || this.creds.password,
      };
      return { steps, creds, source: 'db' };
    } catch (err) {
      return mockCase(this.creds); // bảng chưa có trên Postgres → mock
    }
  }
}

module.exports = PlaywrightRunner;
module.exports.toLocator = toLocator;
module.exports.fillValueFor = fillValueFor;
