const { query, closeDb } = require('../tests/utils/db-client');

// Test_Results.status ENUM trùng với status của Playwright
const VALID_STATUS = ['passed', 'failed', 'timedOut', 'skipped', 'interrupted'];

// Xóa mã màu ANSI trong error message của Playwright
const stripAnsi = (s) => String(s).replace(/\u001b\[[0-9;]*m/g, '');

class MySQLLoggerReporter {
  constructor() {
    // Key = test.id của Playwright; retry thì ghi đè, chỉ giữ lần chạy cuối
    this.results = new Map();
    this.startedAt = new Date();
  }

  onBegin() {
    this.startedAt = new Date();
  }

  onTestEnd(test, result) {
    // Tiêu đề test phải bắt đầu bằng tc_code, ví dụ "TC-AUTH-001: Login page is displayed"
    const match = test.title.match(/^(TC-[\w-]+)/i);
    if (!match) {
      console.warn(`[DB Logger] Bỏ qua test không có mã TC- ở đầu tiêu đề: "${test.title}"`);
      return;
    }

    this.results.set(test.id, {
      tcCode: match[1].toUpperCase(),
      status: VALID_STATUS.includes(result.status) ? result.status : 'interrupted',
      duration: result.duration || 0,
      error: result.error ? stripAnsi(result.error.message) : null,
      retryCount: result.retry || 0,
    });
  }

  async onEnd(result) {
    console.log(`\n[DB Logger] Test run finished with status: ${result.status}`);

    try {
      // 1. Test_Runs
      const runSql = `
        INSERT INTO Test_Runs
          (started_at, finished_at, browser, environment, git_commit, branch_name, ci_run_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      const runResult = await query(runSql, [
        this.startedAt,
        new Date(),
        process.env.PW_BROWSER || 'chromium',
        process.env.BASE_URL || 'Staging',
        process.env.GITHUB_SHA || null,
        process.env.GITHUB_REF_NAME || null,
        process.env.GITHUB_RUN_ID || null,
      ]);
      const runId = runResult.insertId;
      console.log(`[DB Logger] Đã ghi nhận Test Run vào DB thành công, ID: ${runId}`);

      // 2. Test_Results (test case phải có sẵn trong Test_Cases, do seed.sql tạo)
      let saved = 0;
      const missing = [];

      for (const item of this.results.values()) {
        const rows = await query('SELECT test_id FROM Test_Cases WHERE tc_code = ?', [item.tcCode]);
        if (!rows || rows.length === 0) {
          missing.push(item.tcCode);
          continue;
        }

        await query(
          `INSERT INTO Test_Results
             (run_id, test_id, status, execution_time_ms, error_message, retry_count)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [runId, rows[0].test_id, item.status, item.duration, item.error, item.retryCount]
        );
        saved++;
      }

      console.log(`[DB Logger] Đã ghi nhận thành công ${saved} chi tiết Test Results vào DB.`);
      if (missing.length > 0) {
        console.warn(`[DB Logger] Không tìm thấy trong Test_Cases (chưa seed?): ${missing.join(', ')}`);
      }
    } catch (error) {
      console.error('[DB Logger] Lỗi khi lưu kết quả test vào MySQL:', error);
    } finally {
      await closeDb();
    }
  }
}

// Bắt buộc phải export class để Playwright nhận diện
module.exports = MySQLLoggerReporter;