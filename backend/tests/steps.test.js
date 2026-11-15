const test = require('node:test');
const assert = require('node:assert');
const { runCase, runStep, toLocator, fillValueFor, resolveValue } = require('../src/services/runner/steps');

// Fake page: each function returns a label so we can tell which engine toLocator called.
const fakePage = {
  getByPlaceholder: (v) => ({ by: 'placeholder', v }),
  getByText: (v) => ({ by: 'text', v }),
  getByRole: (v) => ({ by: 'role', v }),
  locator: (v) => ({ by: 'css', v }),
};

test('toLocator resolves each prefix', () => {
  assert.deepEqual(toLocator(fakePage, 'placeholder=Enter your password'), { by: 'placeholder', v: 'Enter your password' });
  assert.deepEqual(toLocator(fakePage, 'text=Sign In'), { by: 'text', v: 'Sign In' });
  assert.deepEqual(toLocator(fakePage, 'role=button'), { by: 'role', v: 'button' });
  assert.deepEqual(toLocator(fakePage, '#login'), { by: 'css', v: '#login' }); // no prefix → CSS
});

test('resolveValue reads env: and reports a missing variable', () => {
  process.env.TC_TEST_IRN = '20529999';
  assert.equal(resolveValue('env:TC_TEST_IRN'), '20529999');
  assert.equal(resolveValue('20521234'), '20521234');
  assert.throws(() => resolveValue('env:TC_TEST_MISSING'), /missing environment variable TC_TEST_MISSING/);
});

test('fillValueFor prefers the step field_name column', () => {
  const data = { lecturer_password: 'gv-pass', password: 'sai' };
  const step = {
    step_target: 'placeholder=Enter your password',
    field_name: 'lecturer_password',
    // The column beats the old "(field …)" string, even when the two disagree.
    expected_result: 'Password is entered (field password).',
  };
  assert.equal(fillValueFor(step, data), 'gv-pass');
});

test('fillValueFor prefers "(field …)" in expected_result', () => {
  const data = { lecturer_password: 'gv-pass', password: 'sai' };
  const step = { step_target: 'placeholder=Enter your password', expected_result: 'Password is entered (field lecturer_password).' };
  assert.equal(fillValueFor(step, data), 'gv-pass'); // does not fall back to data.password
});

test('fillValueFor guesses from the placeholder when no field is declared', () => {
  const data = { username: 'u1', password: 'p1' };
  assert.equal(fillValueFor({ step_target: 'placeholder=Enter your password' }, data), 'p1');
  assert.equal(fillValueFor({ step_target: 'placeholder=e.g. 20521234' }, data), 'u1');
});

test('fillValueFor reports a clear error when test_data is missing', () => {
  assert.throws(
    () => fillValueFor({ step_target: 'placeholder=New password', expected_result: '(field new_password)' }, {}),
    /missing test_data .*field new_password/,
  );
});

test('runStep rejects an unsupported action instead of skipping it', async () => {
  await assert.rejects(
    () => runStep(fakePage, { step_action: 'UPLOAD', step_target: null }, {}),
    /unsupported action: UPLOAD/,
  );
});

// --- runCase: returns exactly the shape of a test_results row ---------------

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

test('runCase passes when the url matches expected_url', async () => {
  const r = await runCase(pageAt('http://x/student-history'), {
    steps: LOGIN_STEPS,
    data: { username: 'u', expected_url: '/student-(dashboard|history)' },
  });
  assert.equal(r.status, 'passed');
  assert.equal(r.error, null);
});

test('runCase fails when the url does not match', async () => {
  const r = await runCase(pageAt('http://x/login'), {
    steps: LOGIN_STEPS,
    data: { username: 'u', expected_url: '/student-(dashboard|history)' },
  });
  assert.equal(r.status, 'failed');
  assert.match(r.error, /path is \/login/);
});

test('runCase anchors expected_url at both ends, no partial match', async () => {
  const r = await runCase(pageAt('http://x/student-history-extra'), {
    steps: LOGIN_STEPS,
    data: { username: 'u', expected_url: '/student-(dashboard|history)' },
  });
  assert.equal(r.status, 'failed');
});

test('VERIFY with no target and no expected_url → failed, not a fake passed', async () => {
  const r = await runCase(pageAt('http://x/lecturer-users'), {
    steps: [{ step_order: 1, step_action: 'VERIFY', step_target: null }],
    data: {},
  });
  assert.equal(r.status, 'failed');
  assert.match(r.error, /expected_url/);
});

test('runCase tells timedOut apart from failed', async () => {
  const r = await runCase(pageAt('http://x/login', { failGoto: '/login' }), {
    steps: LOGIN_STEPS, data: { username: 'u' },
  });
  assert.equal(r.status, 'timedOut');
});

test('a test case with no steps → failed, not passed', async () => {
  const r = await runCase(pageAt('http://x/'), { steps: [], data: {} });
  assert.equal(r.status, 'failed');
  assert.match(r.error, /has no steps/);
});

test('requiredFields: the FILL field + expected_url for a VERIFY with no target', () => {
  const { requiredFields } = require('../src/services/runner/steps');
  assert.deepEqual(
    requiredFields([
      { step_action: 'NAVIGATE', step_target: '/' },
      { step_action: 'FILL', step_target: 'placeholder=IRN', field_name: 'username' },
      { step_action: 'FILL', step_target: 'placeholder=Enter your password' }, // guessed: password
      { step_action: 'VERIFY', step_target: 'text=Welcome' }, // has a target → needs no data
      { step_action: 'VERIFY', step_target: null },
    ]),
    ['username', 'password', 'expected_url'],
  );
});
