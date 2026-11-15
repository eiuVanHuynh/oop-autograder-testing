// An end-to-end API smoke script. Needs Node 18+, a running server, and db/seed/dev_seed.sql applied.
//   node scripts/smoke-api.mjs
// Optional variables: API_URL, ADMIN_EMAIL, ADMIN_PASSWORD, VIEWER_EMAIL, VIEWER_PASSWORD, SUITE_ID
// Assumes RUNNER=fake (the run ends by itself after ~3 seconds). With RUNNER=github: EXPECT_FAKE=0.

const API = process.env.API_URL || 'http://localhost:5000/api';
const ADMIN = {
  email: process.env.ADMIN_EMAIL || 'admin@dev.local',
  password: process.env.ADMIN_PASSWORD || 'Admin@123',
};
const VIEWER = {
  email: process.env.VIEWER_EMAIL || 'viewer@dev.local',
  password: process.env.VIEWER_PASSWORD || 'Viewer@123',
};
const EXPECT_FAKE = process.env.EXPECT_FAKE !== '0';

let passed = 0;
let failed = 0;
const check = (name, ok, extra = '') => {
  if (ok) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${name}${extra ? `  → ${extra}` : ''}`);
  }
};
const section = (t) => console.log(`\n${t}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function call(method, path, { token, body } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* body is not JSON */
  }
  return { status: res.status, body: json, text };
}
const errCode = (r) => r.body?.error?.code ?? r.body?.code;
const tokenOf = (r) => r.body?.data?.token ?? r.body?.token;
const brief = (r) => `HTTP ${r.status} ${r.text.slice(0, 200)}`;

const createdTemplates = [];
let adminToken;

async function main() {
  section('1. Sign in');
  let r = await call('POST', '/auth/login', { body: { email: ADMIN.email, password: 'sai-mat-khau' } });
  check('wrong password → 401 INVALID_CREDENTIALS', r.status === 401 && errCode(r) === 'INVALID_CREDENTIALS', brief(r));

  r = await call('POST', '/auth/login', { body: ADMIN });
  adminToken = tokenOf(r);
  check('admin login → 200 + token', r.status === 200 && !!adminToken, brief(r));
  if (!adminToken) throw new Error('No admin token: check that dev_seed.sql ran and JWT_SECRET is set');

  r = await call('POST', '/auth/login', { body: VIEWER });
  const viewerToken = tokenOf(r);
  check('viewer login → 200 + token', r.status === 200 && !!viewerToken, brief(r));

  section('2. Permissions');
  r = await call('GET', '/templates');
  check('no token → 401', r.status === 401, brief(r));
  r = await call('POST', '/templates', {
    token: viewerToken,
    body: { template_name: `viewer-${Date.now()}`, target_json: { testIds: ['TC-DEV-01'] } },
  });
  check('viewer creating a template → 403', r.status === 403, brief(r));

  section('3. Templates');
  const tplBody = {
    template_name: `smoke-${Date.now()}`,
    description: 'created by smoke-api',
    scope: 'UI',
    target_json: { testIds: ['TC-DEV-01', 'TC-DEV-02'] },
    env: 'staging',
    timeout: 20000,
  };
  r = await call('POST', '/templates', { token: adminToken, body: tplBody });
  const tpl = r.body?.data;
  check('create template → 201', r.status === 201 && !!tpl?.template_id, brief(r));
  if (!tpl?.template_id) throw new Error('Could not create the template: has migration 008 been applied?');
  createdTemplates.push(tpl.template_id);

  r = await call('POST', '/templates', { token: adminToken, body: { ...tplBody, target_json: {} } });
  check('empty target_json → 400', r.status === 400, brief(r));

  r = await call('GET', '/templates', { token: adminToken });
  const list = r.body?.data?.data ?? r.body?.data;
  check('the list contains the new template', r.status === 200 && Array.isArray(list) && list.some((t) => t.template_id === tpl.template_id), brief(r));

  r = await call('PUT', `/templates/${tpl.template_id}`, { token: adminToken, body: { description: 'edited' } });
  check('edit template → 200, updated_at changes', r.status === 200 && r.body?.data?.description === 'edited', brief(r));

  r = await call('POST', `/templates/${tpl.template_id}/duplicate`, { token: adminToken });
  const dup = r.body?.data;
  check('duplicate template → 201', r.status === 201 && !!dup?.template_id, brief(r));
  if (dup?.template_id) createdTemplates.push(dup.template_id);

  if (process.env.SUITE_ID) {
    r = await call('POST', '/templates', {
      token: adminToken,
      body: { ...tplBody, template_name: `smoke-suite-${Date.now()}`, target_json: { suiteId: Number(process.env.SUITE_ID) } },
    });
    check('template theo suiteId → 201', r.status === 201, brief(r));
    if (r.body?.data?.template_id) createdTemplates.push(r.body.data.template_id);
  }

  section('4. Creating a run');
  r = await call('POST', '/runs', { token: adminToken, body: { templateId: tpl.template_id, env: 'production' } });
  const run = r.body?.data;
  check('run from a template → 202, status running', r.status === 202 && run?.status === 'running', brief(r));
  check('grep holds only ready tests, in order', run?.config_json?.grep === '(TC-DEV-01|TC-DEV-02) -', JSON.stringify(run?.config_json));
  check('the env picked at run time beats the template env', run?.config_json?.env === 'production', JSON.stringify(run?.config_json));
  if (!run?.run_id) throw new Error('Could not create the run');

  r = await call('POST', '/runs', { token: adminToken, body: { testIds: ['TC-DEV-04'] } });
  check('only draft tests → 409 NO_READY_TESTS', r.status === 409 && errCode(r) === 'NO_READY_TESTS', brief(r));

  r = await call('POST', '/runs', { token: adminToken, body: { testIds: ['x|.*'] } });
  check('unknown test codes are dropped → 409, never reaching grep', r.status === 409, brief(r));

  r = await call('POST', '/runs', { token: adminToken, body: { templateId: tpl.template_id, testIds: ['TC-DEV-01'] } });
  check('sending both templateId and testIds → 400', r.status === 400, brief(r));

  r = await call('POST', '/runs', { token: adminToken, body: { testIds: ['TC-DEV-03'] } });
  check('running straight from testIds → 202', r.status === 202, brief(r));

  section('5. Logs and finishing the run');
  let after = 0;
  const lines = [];
  let status = 'running';
  for (let i = 0; i < 15 && status === 'running'; i += 1) {
    r = await call('GET', `/runs/${run.run_id}/logs?after=${after}`, { token: adminToken });
    if (r.status !== 200) break;
    const d = r.body?.data;
    lines.push(...(d?.lines ?? []));
    after = d?.nextAfter ?? after;
    status = d?.status ?? status;
    if (status === 'running') await sleep(1000);
  }
  if (EXPECT_FAKE) {
    check('≥ 3 log lines, with increasing seq', lines.length >= 3 && lines.every((l, i) => i === 0 || l.seq > lines[i - 1].seq), JSON.stringify(lines));
    check('FakeRunner finishes the run → passed', status === 'passed', `status=${status}`);
  } else {
    check('the logs endpoint returns 200', r.status === 200, brief(r));
  }

  section('6. History and filters');
  r = await call('GET', `/runs/${run.run_id}`, { token: adminToken });
  check('run details → 200, with tester_id and environment', r.status === 200 && !!r.body?.data?.tester_id && r.body.data.environment === 'production', brief(r));
  r = await call('GET', '/runs?status=weird', { token: adminToken });
  check('an invalid status → 400', r.status === 400, brief(r));
  r = await call('GET', '/runs?limit=5&page=1', { token: adminToken });
  check('pagination → at most 5 rows + meta.total', r.status === 200 && r.body?.data?.length <= 5 && Number.isInteger(r.body?.meta?.total), brief(r));
  if (EXPECT_FAKE) {
    r = await call('GET', '/runs?status=passed', { token: adminToken });
    check('filtering status=passed contains the finished run', r.status === 200 && r.body?.data?.some((x) => x.run_id === run.run_id), brief(r));
  }

  section('7. Cancel and rerun');
  r = await call('POST', '/runs', { token: adminToken, body: { templateId: tpl.template_id } });
  const run2 = r.body?.data;
  r = await call('POST', `/runs/${run2.run_id}/cancel`, { token: adminToken });
  check('cancelling a running run → 200, interrupted', r.status === 200 && r.body?.data?.status === 'interrupted', brief(r));
  r = await call('POST', `/runs/${run2.run_id}/cancel`, { token: adminToken });
  check('cancelling a second time → 409', r.status === 409, brief(r));
  await sleep(3000);
  r = await call('GET', `/runs/${run2.run_id}`, { token: adminToken });
  check('FakeRunner does not overwrite a cancelled status', r.body?.data?.status === 'interrupted', brief(r));

  r = await call('POST', `/runs/${run.run_id}/rerun`, { token: adminToken });
  check('rerun → 202, keeps the old config', r.status === 202 && r.body?.data?.config_json?.env === 'production' && String(r.body?.data?.run_name).startsWith('Rerun_'), brief(r));
}

try {
  await main();
} catch (err) {
  failed += 1;
  console.log(`\n  ABORTED: ${err.message}`);
} finally {
  if (adminToken) {
    for (const id of createdTemplates) await call('DELETE', `/templates/${id}`, { token: adminToken });
  }
  console.log(`\nResult: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}
