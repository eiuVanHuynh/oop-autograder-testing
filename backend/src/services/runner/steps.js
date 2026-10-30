// Bộ diễn giải MỘT test case từ test_steps / test_data.
// Interprets ONE test case out of test_steps / test_data.
//
// Dùng chung cho hai nơi, nên KHÔNG require express, pg, playwright hay config/env:
//   - backend (RUNNER=playwright, chạy local)  → page từ chromium.launch().newPage()
//   - spec trong GitHub Actions                → page từ fixture của @playwright/test
// Cả hai nơi đưa vào cùng một đối tượng `page` (hai thư viện trả về cùng class Page của
// Playwright), nên module này không cần tầng adapter nào.
//
// Thêm một action mới = thêm một dòng vào ACTIONS. Đừng thêm `if` ở nơi gọi.
// Từ vựng hiện tại cố ý hẹp: NAVIGATE, FILL, CLICK, VERIFY. TC nào cần hơn thì để
// test_status = 'draft' cho tới khi từ vựng mở rộng (xem migration 010).

// placeholder=... | text=... | role=... | css=... (không có tiền tố → coi như CSS selector)
function toLocator(page, target) {
  const m = /^(placeholder|text|role|css)=([\s\S]+)$/.exec(target || '');
  if (!m) return page.locator(target);
  const [, kind, value] = m;
  if (kind === 'placeholder') return page.getByPlaceholder(value);
  if (kind === 'text') return page.getByText(value, { exact: false });
  if (kind === 'role') return page.getByRole(value);
  return page.locator(value);
}

// test_data trỏ sang biến môi trường: 'env:TEST_STUDENT_IRN'.
// Chỉ giải ở NƠI CHẠY TEST, không giải ở backend: mật khẩu thật không được đi qua HTTP
// rồi lọt vào log Actions của repo public (backend-design.md mục 5).
function resolveValue(value) {
  const m = /^env:(.+)$/.exec(String(value ?? ''));
  if (!m) return value;
  const got = process.env[m[1]];
  if (got == null || got === '') throw new Error(`thiếu biến môi trường ${m[1]}`);
  return got;
}

// test_steps không có cột field_name; seed ghi tên field trong expected_result:
// "IRN is entered (field lecturer_username)." → lecturer_username.
function fieldOf(step) {
  const m = /\(field\s+([A-Za-z0-9_]+)\)/.exec(step.expected_result || '');
  return m ? m[1] : null;
}

// Giá trị để FILL. shortcut: không khai "(field …)" thì đoán theo placeholder chứa "password";
// bỏ được khi test_steps có cột field_name trỏ thẳng test_data.
function fillValueFor(step, data) {
  const field = fieldOf(step) || (/password/i.test(step.step_target || '') ? 'password' : 'username');
  const value = resolveValue(data[field]);
  if (value == null || value === '') {
    throw new Error(`thiếu test_data cho FILL ${step.step_target} (field ${field})`);
  }
  return String(value);
}

async function verify(page, step, data, log) {
  const target = step.step_target;
  if (target) {
    await toLocator(page, target).waitFor({ state: 'visible' });
    await log('info', `VERIFY visible ${target}`);
    return;
  }

  // VERIFY không có target thì phải dựa vào test_data.expected_url, nếu không bước này
  // không khẳng định được gì và sẽ báo 'passed' giả.
  const expected = data.expected_url;
  if (!expected) {
    throw new Error('VERIFY không có step_target và test_data cũng không có expected_url');
  }

  await page.waitForLoadState('networkidle').catch(() => {});
  const path = new URL(page.url()).pathname;
  if (!new RegExp(`^${resolveValue(expected)}$`).test(path)) {
    throw new Error(`đường dẫn là ${path}, mong đợi ${expected}`);
  }
  await log('info', `VERIFY url ${path}`);
}

// Map action → việc cần làm. Đây là Strategy: mỗi giá trị là một chiến lược thực thi,
// viết bằng hàm thay vì class vì không có trạng thái nào phải mang theo.
const ACTIONS = {
  NAVIGATE: async (page, step, data, log) => {
    await page.goto(step.step_target);
    await log('info', `NAVIGATE ${step.step_target}`);
  },
  FILL: async (page, step, data, log) => {
    await toLocator(page, step.step_target).fill(fillValueFor(step, data));
    await log('info', `FILL ${step.step_target}`);
  },
  CLICK: async (page, step, data, log) => {
    await toLocator(page, step.step_target).click();
    await log('info', `CLICK ${step.step_target}`);
  },
  VERIFY: verify,
};

const noop = async () => {};

async function runStep(page, step, data, log = noop) {
  const action = String(step.step_action || '').toUpperCase();
  const run = ACTIONS[action];
  // Action lạ phải làm test fail, không được bỏ qua: bỏ qua là báo 'passed' cho một bước
  // chưa bao giờ được thực hiện.
  if (!run) throw new Error(`action chưa hỗ trợ: ${step.step_action}`);
  await run(page, step, data, log);
}

// Chạy cả test case. Trả { status, ms, actual, error } — đúng hình dạng một dòng test_results.
// Không ném lỗi ra ngoài: một case fail không được làm dừng các case còn lại.
async function runCase(page, kase, log = noop) {
  const startedAt = Date.now();
  const steps = [...(kase.steps || [])].sort((a, b) => a.step_order - b.step_order);
  try {
    if (!steps.length) throw new Error('test case không có bước nào trong test_steps');
    for (const step of steps) await runStep(page, step, kase.data || {}, log);
    return { status: 'passed', ms: Date.now() - startedAt, actual: page.url(), error: null };
  } catch (err) {
    const status = /timeout/i.test(err.message) ? 'timedOut' : 'failed';
    return { status, ms: Date.now() - startedAt, actual: page.url(), error: err.message };
  }
}

module.exports = { runCase, runStep, toLocator, fillValueFor, resolveValue, fieldOf, ACTIONS };
