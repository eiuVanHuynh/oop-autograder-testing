// The interpreter for ONE test case built from test_steps / test_data.
//
// Shared by two callers, so it must NOT require express, pg, playwright or config/env:
//   - the backend (RUNNER=playwright, local)  → page from chromium.launch().newPage()
//   - the spec in GitHub Actions                → page from the @playwright/test fixture
// Both callers pass in the same `page` object (both libraries return Playwright's own Page
// class), so this module needs no adapter layer.
//
// Adding a new action = adding one line to ACTIONS. Do not add an `if` at the call site.
// The current vocabulary is deliberately narrow: NAVIGATE, FILL, CLICK, VERIFY. A TC that needs more should
// test_status = 'draft' until the vocabulary grows (see migration 010).

// placeholder=... | text=... | role=... | css=... (no prefix → treated as a CSS selector)
function toLocator(page, target) {
  const m = /^(placeholder|text|role|css)=([\s\S]+)$/.exec(target || '');
  if (!m) return page.locator(target);
  const [, kind, value] = m;
  if (kind === 'placeholder') return page.getByPlaceholder(value);
  if (kind === 'text') return page.getByText(value, { exact: false });
  if (kind === 'role') return page.getByRole(value);
  return page.locator(value);
}

// test_data can point at an environment variable: 'env:TEST_STUDENT_IRN'.
// Resolved ONLY WHERE THE TEST RUNS, never in the backend: a real password must not travel over HTTP
// and end up in a public repo's Actions log (backend-design.md section 5).
function resolveValue(value) {
  const m = /^env:(.+)$/.exec(String(value ?? ''));
  if (!m) return value;
  const got = process.env[m[1]];
  if (got == null || got === '') throw new Error(`missing environment variable ${m[1]}`);
  return got;
}

// The test_data field a FILL step writes into: the test_steps.field_name column (migration 011).
// shortcut: still parses the "(field x)" string in expected_result as a fallback for old step rows
// with an empty column; drop the regex branch once every FILL step has a field_name.
function fieldOf(step) {
  if (step.field_name) return step.field_name;
  const m = /\(field\s+([A-Za-z0-9_]+)\)/.exec(step.expected_result || '');
  return m ? m[1] : null;
}

// The field a FILL step writes. shortcut: a step with no field_name (and no
// "(field …)") is guessed from a placeholder containing "password"; drop the guess branch once every FILL
// step has a field_name.
function fieldFor(step) {
  return fieldOf(step) || (/password/i.test(step.step_target || '') ? 'password' : 'username');
}

// The test_data fields a set of steps MUST have to be runnable — exactly the fields
// runStep will read. Used by PUT /catalog/cases/:id to block a test_status = 'ready' with missing data,
// so the rule must live NEXT TO what enforces it, not be copied into a service.
function requiredFields(steps = []) {
  const out = new Set();
  for (const step of steps) {
    const action = String(step.step_action || '').toUpperCase();
    if (action === 'FILL') out.add(fieldFor(step));
    // A VERIFY with no target only has test_data.expected_url left to assert on (see verify()).
    else if (action === 'VERIFY' && !step.step_target) out.add('expected_url');
  }
  return [...out];
}

// The value to FILL in.
function fillValueFor(step, data) {
  const field = fieldFor(step);
  const value = resolveValue(data[field]);
  if (value == null || value === '') {
    throw new Error(`missing test_data for FILL ${step.step_target} (field ${field})`);
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

  // A VERIFY with no target must rely on test_data.expected_url, otherwise this step
  // asserts nothing and would report a fake 'passed'.
  const expected = data.expected_url;
  if (!expected) {
    throw new Error('VERIFY has no step_target and test_data has no expected_url either');
  }

  await page.waitForLoadState('networkidle').catch(() => {});
  const path = new URL(page.url()).pathname;
  if (!new RegExp(`^${resolveValue(expected)}$`).test(path)) {
    throw new Error(`path is ${path}, expected ${expected}`);
  }
  await log('info', `VERIFY url ${path}`);
}

// Map of action → what to do. This is Strategy: each value is an execution strategy,
// written as a function rather than a class because there is no state to carry.
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
  // An unknown action must fail the test, never be skipped: skipping reports 'passed' for a step
  // that was never performed.
  if (!run) throw new Error(`unsupported action: ${step.step_action}`);
  await run(page, step, data, log);
}

// Run the whole test case. Returns { status, ms, actual, error } — exactly the shape of a test_results row.
// Never throws: one failing case must not stop the remaining cases.
async function runCase(page, kase, log = noop) {
  const startedAt = Date.now();
  const steps = [...(kase.steps || [])].sort((a, b) => a.step_order - b.step_order);
  try {
    if (!steps.length) throw new Error('the test case has no steps in test_steps');
    for (const step of steps) await runStep(page, step, kase.data || {}, log);
    return { status: 'passed', ms: Date.now() - startedAt, actual: page.url(), error: null };
  } catch (err) {
    const status = /timeout/i.test(err.message) ? 'timedOut' : 'failed';
    return { status, ms: Date.now() - startedAt, actual: page.url(), error: err.message };
  }
}

module.exports = { runCase, runStep, toLocator, fillValueFor, resolveValue, fieldOf, requiredFields, ACTIONS };
