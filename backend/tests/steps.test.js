const test = require('node:test');
const assert = require('node:assert');
const { runCase, runStep, toLocator, fillValueFor, resolveValue } = require('../src/services/runner/steps');

// page giả: mỗi hàm trả nhãn để biết toLocator gọi đúng engine nào.
const fakePage = {
  getByPlaceholder: (v) => ({ by: 'placeholder', v }),
  getByText: (v) => ({ by: 'text', v }),
  getByRole: (v) => ({ by: 'role', v }),
  locator: (v) => ({ by: 'css', v }),
};

test('toLocator phân giải đúng prefix', () => {
  assert.deepEqual(toLocator(fakePage, 'placeholder=Enter your password'), { by: 'placeholder', v: 'Enter your password' });
  assert.deepEqual(toLocator(fakePage, 'text=Sign In'), { by: 'text', v: 'Sign In' });
  assert.deepEqual(toLocator(fakePage, 'role=button'), { by: 'role', v: 'button' });
  assert.deepEqual(toLocator(fakePage, '#login'), { by: 'css', v: '#login' }); // không prefix → CSS
});

test('resolveValue đọc env: và báo lỗi khi thiếu biến', () => {
  process.env.TC_TEST_IRN = '20529999';
  assert.equal(resolveValue('env:TC_TEST_IRN'), '20529999');
  assert.equal(resolveValue('20521234'), '20521234');
  assert.throws(() => resolveValue('env:TC_TEST_KHONG_CO'), /thiếu biến môi trường TC_TEST_KHONG_CO/);
});

test('fillValueFor ưu tiên cột field_name của bước', () => {
  const data = { lecturer_password: 'gv-pass', password: 'sai' };
  const step = {
    step_target: 'placeholder=Enter your password',
    field_name: 'lecturer_password',
    // Cột thắng chuỗi "(field …)" cũ, kể cả khi hai bên nói khác nhau.
    expected_result: 'Password is entered (field password).',
  };
  assert.equal(fillValueFor(step, data), 'gv-pass');
});

test('fillValueFor ưu tiên "(field …)" trong expected_result', () => {
  const data = { lecturer_password: 'gv-pass', password: 'sai' };
  const step = { step_target: 'placeholder=Enter your password', expected_result: 'Password is entered (field lecturer_password).' };
  assert.equal(fillValueFor(step, data), 'gv-pass'); // không rơi vào data.password
});

test('fillValueFor đoán theo placeholder khi không khai field', () => {
  const data = { username: 'u1', password: 'p1' };
  assert.equal(fillValueFor({ step_target: 'placeholder=Enter your password' }, data), 'p1');
  assert.equal(fillValueFor({ step_target: 'placeholder=e.g. 20521234' }, data), 'u1');
});

test('fillValueFor báo lỗi rõ khi thiếu test_data', () => {
  assert.throws(
    () => fillValueFor({ step_target: 'placeholder=New password', expected_result: '(field new_password)' }, {}),
    /thiếu test_data .*field new_password/,
  );
});

test('runStep từ chối action chưa hỗ trợ thay vì bỏ qua', async () => {
  await assert.rejects(
    () => runStep(fakePage, { step_action: 'UPLOAD', step_target: null }, {}),
    /action chưa hỗ trợ: UPLOAD/,
  );
});

// --- runCase: trả về đúng hình dạng một dòng test_results -------------------

function pageAt(url, { failGoto } = {}) {
  return {
    url: () => url,
    goto: async (t) => { if (t === failGoto) throw new Error('Timeout 30000ms exceeded'); },
    waitForLoadState: async () => {},
    locator: () => ({ fill: async () => {}, click: async () => {}, waitFor: async () => {} }),
    getByPlaceholder: () => ({ fill: async () => {} }),
    getByText: () => ({ click: async () => {}, waitFor: async () => {} }),
    getByRole: () => ({ click: async () => {} }),
  };
}

const LOGIN_STEPS = [
  { step_order: 1, step_action: 'NAVIGATE', step_target: '/login' },
  { step_order: 2, step_action: 'FILL', step_target: 'placeholder=e.g. 20521234', expected_result: '(field username)' },
  { step_order: 3, step_action: 'CLICK', step_target: 'text=Sign In' },
  { step_order: 4, step_action: 'VERIFY', step_target: null },
];

test('runCase passed khi url khớp expected_url', async () => {
  const r = await runCase(pageAt('http://x/student-history'), {
    steps: LOGIN_STEPS,
    data: { username: 'u', expected_url: '/student-(dashboard|history)' },
  });
  assert.equal(r.status, 'passed');
  assert.equal(r.error, null);
});

test('runCase failed khi url không khớp', async () => {
  const r = await runCase(pageAt('http://x/login'), {
    steps: LOGIN_STEPS,
    data: { username: 'u', expected_url: '/student-(dashboard|history)' },
  });
  assert.equal(r.status, 'failed');
  assert.match(r.error, /đường dẫn là \/login/);
});

test('runCase expected_url neo hai đầu, không khớp một phần', async () => {
  const r = await runCase(pageAt('http://x/student-history-extra'), {
    steps: LOGIN_STEPS,
    data: { username: 'u', expected_url: '/student-(dashboard|history)' },
  });
  assert.equal(r.status, 'failed');
});

test('VERIFY không target mà cũng không expected_url → failed, không passed giả', async () => {
  const r = await runCase(pageAt('http://x/lecturer-users'), {
    steps: [{ step_order: 1, step_action: 'VERIFY', step_target: null }],
    data: {},
  });
  assert.equal(r.status, 'failed');
  assert.match(r.error, /expected_url/);
});

test('runCase phân biệt timedOut với failed', async () => {
  const r = await runCase(pageAt('http://x/login', { failGoto: '/login' }), {
    steps: LOGIN_STEPS, data: { username: 'u' },
  });
  assert.equal(r.status, 'timedOut');
});

test('test case không có bước nào → failed, không passed', async () => {
  const r = await runCase(pageAt('http://x/'), { steps: [], data: {} });
  assert.equal(r.status, 'failed');
  assert.match(r.error, /không có bước nào/);
});

test('requiredFields: field của FILL + expected_url cho VERIFY không target', () => {
  const { requiredFields } = require('../src/services/runner/steps');
  assert.deepEqual(
    requiredFields([
      { step_action: 'NAVIGATE', step_target: '/' },
      { step_action: 'FILL', step_target: 'placeholder=IRN', field_name: 'username' },
      { step_action: 'FILL', step_target: 'placeholder=Enter your password' }, // đoán: password
      { step_action: 'VERIFY', step_target: 'text=Welcome' }, // có target → không cần dữ liệu
      { step_action: 'VERIFY', step_target: null },
    ]),
    ['username', 'password', 'expected_url'],
  );
});
