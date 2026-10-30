const { test } = require('@playwright/test');
const path = require('path');
const { runStep } = require('../../../backend/src/services/runner/steps');

// Diễn giải test_steps của từng test case trong kế hoạch của run.
// Interprets each planned test case's test_steps.
//
// Bộ diễn giải (runStep) dùng CHUNG với backend — một ngôn ngữ bước, một bản cài đặt.
// Ở đây cố ý KHÔNG bắt lỗi: để lỗi nổi lên cho Playwright đánh dấu test fail, nhờ đó
// retry / trace / screenshot / thời gian chạy do Playwright lo, còn việc đẩy kết quả
// về backend là của reporters/push-to-backend.js.
//
// Chạy scripts/fetch-plan.js trước để có plan.json.
let plan;
try {
  plan = require(path.join(__dirname, '../../plan.json'));
} catch {
  throw new Error('Thiếu plan.json — chạy `node scripts/fetch-plan.js` trước (cần RUN_ID).');
}

test.describe.configure({ mode: 'serial' }); // các case dùng chung một tài khoản test

for (const kase of plan.cases) {
  // Tiêu đề bắt đầu bằng mã test: reporter dò mã từ đây để ghi đúng dòng test_results.
  test(`${kase.code} - ${kase.title}`, async ({ page }) => {
    test.setTimeout((plan.timeout || 30000) * Math.max(1, kase.steps.length));
    if (!kase.steps.length) throw new Error('test case không có bước nào trong test_steps');

    for (const step of [...kase.steps].sort((a, b) => a.step_order - b.step_order)) {
      await test.step(`${step.step_action} ${step.step_target || ''}`.trim(), async () => {
        await runStep(page, step, kase.data);
      });
    }
  });
}
