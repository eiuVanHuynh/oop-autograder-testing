// Only accepts TEST_DATABASE_URL, never falls back to DATABASE_URL: this test writes and deletes real rows,
// and picking up .env by mistake would hit Supabase.
//
// This is the ONE test file that needs a real PostgreSQL: it checks the SQL itself (seq numbering of
// run_logs, ON CONFLICT on test_results, the computed run status), which an in-memory stub would only
// pretend to verify. No TEST_DATABASE_URL → every test here is SKIPPED, so `npm test` stays green on a
// machine with no database; the rest of the suite runs against fake repositories and needs nothing.
// To run it: start a throwaway postgres, migrate it, then
//   TEST_DATABASE_URL=postgresql://postgres:x@localhost:55432/test_automation_db npm test
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL || 'postgresql://postgres:x@localhost:55432/test_automation_db';
process.env.JWT_SECRET = 'test-secret';
process.env.INGEST_API_KEY = 'secret-ci-key';
process.env.RUNNER = 'fake';

const nodeTest = require('node:test');
const assert = require('node:assert');

const SKIP = process.env.TEST_DATABASE_URL
  ? false
  : 'needs a real PostgreSQL: set TEST_DATABASE_URL (see the note at the top of this file)';

// Same signature as node:test, with the whole file switched off when there is no database.
const test = (name, fn) => {
  nodeTest(name, { skip: SKIP }, fn);
};
test.before = nodeTest.before;
test.after = nodeTest.after;
const request = require('supertest');
const path = require('path');
const BE = require('path').resolve(__dirname, '../');
const app = require(BE + '/src/app');
const { query, getPool } = require(BE + '/src/config/db');

const KEY = { 'x-api-key': 'secret-ci-key' };
let runId;

// testCodes is deliberately NOT in alphabetical order: the plan must come back in this order
// (issue #67). With ["TC-01","TC-02","TC-31"] an ORDER BY tc_code would pass too and the test
// would be blind to a regression.
test.before(async () => {
  if (SKIP) return;
  const r = await query(
    `INSERT INTO test_runs (run_name, tester_id, environment, config_json)
     VALUES ('ingest-test', (SELECT user_id FROM users ORDER BY user_id LIMIT 1), 'development',
             '{"testCodes":["TC-31","TC-01","TC-02"],"env":"development","timeout":30000}'::jsonb)
     RETURNING run_id`,
  );
  runId = r.rows[0].run_id;
});

test.after(async () => {
  if (SKIP) return;
  await query('DELETE FROM test_runs WHERE run_id = $1', [runId]);
  await getPool().end();
});

test('a missing x-api-key → 401', async () => {
  await request(app).get(`/api/ingest/runs/${runId}/plan`).expect(401);
});

test('a wrong x-api-key → 401, not 500', async () => {
  await request(app).get(`/api/ingest/runs/${runId}/plan`).set('x-api-key', 'sai').expect(401);
  // a key of a very different length: timingSafeEqual must not throw on the length
  await request(app).get(`/api/ingest/runs/${runId}/plan`).set('x-api-key', 'x').expect(401);
});

test('plan returns all 3 cases with steps and data, in the order config_json asks for', async () => {
  const res = await request(app).get(`/api/ingest/runs/${runId}/plan`).set(KEY).expect(200);
  const { cases } = res.body.data;
  // The execution order of the run, not the alphabet (issue #67).
  assert.deepEqual(cases.map((c) => c.code), ['TC-31', 'TC-01', 'TC-02']);
  const tc01 = cases.find((c) => c.code === 'TC-01');
  assert.deepEqual(tc01.steps.map((s) => s.step_action), ['NAVIGATE', 'FILL', 'FILL', 'CLICK', 'VERIFY']);
  assert.equal(tc01.steps[0].step_target, '/'); // the SUT has no /login (sut-reference.md section 2)
  // The password must NOT be resolved in the backend
  assert.equal(tc01.data.password, 'env:TEST_STUDENT_PASSWORD');
  assert.equal(tc01.data.expected_url, '/student-(dashboard|history)');
});

test('plan for a missing run → 404', async () => {
  await request(app).get('/api/ingest/runs/999999/plan').set(KEY).expect(404);
});

test('logs: two consecutive batches get increasing, non-duplicate seq', async () => {
  await request(app).post(`/api/ingest/runs/${runId}/logs`).set(KEY)
    .send({ lines: [{ message: 'a' }, { level: 'warn', message: 'b' }] }).expect(202);
  await request(app).post(`/api/ingest/runs/${runId}/logs`).set(KEY)
    .send({ lines: [{ message: 'c' }] }).expect(202);
  const rows = (await query('SELECT seq, level, message FROM run_logs WHERE run_id=$1 ORDER BY seq', [runId])).rows;
  assert.deepEqual(rows.map((r) => [Number(r.seq), r.level, r.message]),
    [[1, 'info', 'a'], [2, 'warn', 'b'], [3, 'info', 'c']]);
});

test('results: written, and unknown codes are reported back in unknown', async () => {
  const res = await request(app).post(`/api/ingest/runs/${runId}/results`).set(KEY).send({
    results: [
      { code: 'TC-01', status: 'passed', ms: 1200 },
      { code: 'TC-02', status: 'failed', ms: 800, error: 'wrong message' },
      { code: 'TC-UNKNOWN', status: 'passed', ms: 1 },
    ],
  }).expect(201);
  assert.equal(res.body.data.saved, 2);
  assert.deepEqual(res.body.data.unknown, ['TC-UNKNOWN']);
});

test('an unknown results status → 400', async () => {
  await request(app).post(`/api/ingest/runs/${runId}/results`).set(KEY)
    .send({ results: [{ code: 'TC-01', status: 'bay-gio-moi-biet' }] }).expect(400);
});

// Bằng chứng (ảnh/trace): CI gửi ĐƯỜNG DẪN lên, trang báo cáo đọc lại theo từng kết quả.
test('evidences: ghi theo result_id, đọc lại theo run + result', async () => {
  const resultId = (await query(
    'SELECT execution_id FROM test_results WHERE run_id=$1 ORDER BY execution_id LIMIT 1', [runId],
  )).rows[0].execution_id;

  const res = await request(app).post(`/api/ingest/results/${resultId}/evidences`).set(KEY).send({
    evidences: [
      { type: 'screenshot', path: 'https://github.com/x/y/actions/runs/1/artifacts/2#shot.png' },
      { type: 'trace', path: 'trace.zip' },
    ],
  }).expect(201);
  assert.equal(res.body.data.written, 2);

  // result_id không tồn tại → 404 (FK sẽ chặn, nhưng phải là 404 chứ không phải 500)
  await request(app).post('/api/ingest/results/999999/evidences').set(KEY)
    .send({ evidences: [{ type: 'trace', path: 'x' }] }).expect(404);
  // evidence_type ngoài CHECK của DB → 400, không để thành 500
  await request(app).post(`/api/ingest/results/${resultId}/evidences`).set(KEY)
    .send({ evidences: [{ type: 'video', path: 'x' }] }).expect(400);

  const jwt = require('jsonwebtoken');
  const user = (await query("SELECT user_id FROM users WHERE user_status='active' LIMIT 1")).rows[0];
  const auth = ['Authorization', `Bearer ${jwt.sign({ user_id: user.user_id }, 'test-secret')}`];

  const read = await request(app)
    .get(`/api/runs/${runId}/results/${resultId}/evidences`).set(...auth).expect(200);
  assert.deepEqual(read.body.data.map((e) => e.evidence_type).sort(), ['screenshot', 'trace']);

  // Một resultId không thuộc run này phải là 404, KHÔNG phải danh sách rỗng: nhầm id thì phải biết.
  await request(app).get(`/api/runs/${runId}/results/999999/evidences`).set(...auth).expect(404);
});

test('finish: the run status is computed from test_results, and the logs are kept for the report', async () => {
  const res = await request(app).patch(`/api/ingest/runs/${runId}/finish`).set(KEY).send({}).expect(200);
  assert.equal(res.body.data.status, 'failed'); // there is 1 failed row
  assert.equal(res.body.data.final_status, null);
  const logs = (await query('SELECT count(*)::int n FROM run_logs WHERE run_id=$1', [runId])).rows[0].n;
  assert.ok(logs > 0, 'the report page reads the log through GET /runs/:id/logs, so finish must not delete it');
});

test('a second finish → 409', async () => {
  await request(app).patch(`/api/ingest/runs/${runId}/finish`).set(KEY).send({}).expect(409);
});

test('results after finish → 409', async () => {
  await request(app).post(`/api/ingest/runs/${runId}/results`).set(KEY)
    .send({ results: [{ code: 'TC-01', status: 'passed' }] }).expect(409);
});
