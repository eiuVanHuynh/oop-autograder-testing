const { query, closeDb } = require('./db-client');
const crypto = require('crypto');

class MySQLLoggerReporter {
  constructor() {
    this.testResultsBuffer = [];
  }

  onTestEnd(test, result) {
    const testIdMatch = test.title.match(/^(TC-[\w-]+)/i);
    const testId = testIdMatch ? testIdMatch[1] : 'TC-01';

    this.testResultsBuffer.push({
      testId: testId,
      testTitle: test.title,
      status: result.status === 'passed' ? 'PASSED' : result.status === 'failed' ? 'FAILED' : 'SKIPPED',
      duration: result.duration || 0,
      error: result.error ? result.error.message : null
    });
  }

  async onEnd(result) {
    console.log(`\n[DB Logger] Test run finished with status: ${result.status}`);
    
    try {
      const runSql = `INSERT INTO Test_Runs (run_name, environment, browser, executed_by) VALUES (?, ?, ?, ?)`;
      const runName = `Run-${new Date().toISOString()}`;
      const environment = process.env.BASE_URL || 'Staging';
      const browser = process.env.PW_BROWSER || 'chromium';
      
      const runResult = await query(runSql, [runName, environment, browser, 'Automation Tester']);
      const runId = runResult.insertId;
      console.log(`[DB Logger] Đã ghi nhận Test Run vào DB thành công, ID: ${runId}`);

      await query(`
        INSERT INTO Test_Suites (suite_id, suite_name, module_group, description) 
        VALUES (1, 'Authentication Suite', 'Auth', 'Automatic Test Suite')
        ON DUPLICATE KEY UPDATE suite_name=suite_name;
      `);

      for (const item of this.testResultsBuffer) {
        await query(`
          INSERT INTO Test_Cases (test_id, suite_id, module, title, description, test_type, priority) 
          VALUES (?, 1, 'Authentication', ?, 'Automated Test Case', 'AUTHENTICATION', 'HIGH')
          ON DUPLICATE KEY UPDATE title = VALUES(title);
        `, [item.testId, item.testTitle]);

        const executionId = `EXEC-${crypto.randomUUID()}`;
        const detailSql = `
          INSERT INTO Test_Results (execution_id, run_id, test_id, status, execution_time_ms, error_message) 
          VALUES (?, ?, ?, ?, ?, ?)
        `;
        await query(detailSql, [
          executionId, 
          runId, 
          item.testId, 
          item.status, 
          item.duration, 
          item.error
        ]);
      }
      
      console.log(`[DB Logger] Đã ghi nhận thành công ${this.testResultsBuffer.length} chi tiết Test Results vào DB.`);

    } catch (error) {
      console.error('[DB Logger] Lỗi khi lưu kết quả test vào MySQL:', error);
    } finally {
      await closeDb();
    }
  }
}

// Bắt buộc phải export class để Playwright nhận diện
module.exports = MySQLLoggerReporter;