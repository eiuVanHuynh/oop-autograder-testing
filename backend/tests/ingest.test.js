// Chỉ nhận TEST_DATABASE_URL, KHÔNG tự lấy DATABASE_URL: test có ghi/xóa dòng thật,
// lấy nhầm .env là chạy thẳng lên Supabase. Mặc định: container postgres tạm ở cổng 55432.
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL || 'postgresql://postgres:x@localhost:55432/test_automation_db';
process.env.JWT_SECRET = 'test-secret';
process.env.INGEST_API_KEY = 'secret-ci-key';
process.env.RUNNER = 'fake';

const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const path = require('path');
const BE = require('path').resolve(__dirname, '../');
const app = require(BE + '/src/app');
const { query, getPool } = require(BE + '/src/config/db');

const KEY = { 'x-api-key': 'secret-ci-key' };
let runId;

test.before(async () => {
  const r = await query(
    `INSERT INTO test_runs (run_name, tester_id, environment, config_json)
     VALUES ('ingest-test', (SELECT user_id FROM users ORDER BY user_id LIMIT 1), 'development',
             '{"testCodes":["TC-01","TC-02","TC-31"],"env":"development","timeout":30000}'::jsonb)
     RETURNING run_id`,
  );
  runId = r.rows[0].run_id;
});

test.after(async () => {
  await query('DELETE FROM test_runs WHERE run_id = $1', [runId]);
  await getPool().end();
});

test('thiếu x-api-key → 401', async () => {
  await request(app).get(`/api/ingest/runs/${runId}/plan`).expect(401);
});

test('sai x-api-key → 401, không 500', async () => {
  await request(app).get(`/api/ingest/runs/${runId}/plan`).set('x-api-key', 'sai').expect(401);
  // khóa dài khác hẳn: timingSafeEqual không được ném lỗi độ dài
  await request(app).get(`/api/ingest/runs/${runId}/plan`).set('x-api-key', 'x').expect(401);
});

test('plan trả đủ 3 case kèm bước và dữ liệu, giữ nguyên env:', async () => {
  const res = await request(app).get(`/api/ingest/runs/${runId}/plan`).set(KEY).expect(200);
  const { cases } = res.body.data;
  assert.deepEqual(cases.map((c) => c.code), ['TC-01', 'TC-02', 'TC-31']);
  const tc01 = cases[0];
  assert.deepEqual(tc01.steps.map((s) => s.step_action), ['NAVIGATE', 'FILL', 'FILL', 'CLICK', 'VERIFY']);
  assert.equal(tc01.steps[0].step_target, '/'); // SUT không có /login (sut-reference.md mục 2)
  // Mật khẩu KHÔNG được giải ở backend
  assert.equal(tc01.data.password, 'env:TEST_STUDENT_PASSWORD');
  assert.equal(tc01.data.expected_url, '/student-(dashboard|history)');
});

test('plan của run không tồn tại → 404', async () => {
  await request(app).get('/api/ingest/runs/999999/plan').set(KEY).expect(404);
});

test('logs: 2 lô liên tiếp có seq tăng dần, không trùng', async () => {
  await request(app).post(`/api/ingest/runs/${runId}/logs`).set(KEY)
    .send({ lines: [{ message: 'a' }, { level: 'warn', message: 'b' }] }).expect(202);
  await request(app).post(`/api/ingest/runs/${runId}/logs`).set(KEY)
    .send({ lines: [{ message: 'c' }] }).expect(202);
  const rows = (await query('SELECT seq, level, message FROM run_logs WHERE run_id=$1 ORDER BY seq', [runId])).rows;
  assert.deepEqual(rows.map((r) => [Number(r.seq), r.level, r.message]),
    [[1, 'info', 'a'], [2, 'warn', 'b'], [3, 'info', 'c']]);
});

test('results: ghi được, mã lạ báo lại trong unknown', async () => {
  const res = await request(app).post(`/api/ingest/runs/${runId}/results`).set(KEY).send({
    results: [
      { code: 'TC-01', status: 'passed', ms: 1200 },
      { code: 'TC-02', status: 'failed', ms: 800, error: 'sai thông báo' },
      { code: 'TC-KHONG-CO', status: 'passed', ms: 1 },
    ],
  }).expect(201);
  assert.equal(res.body.data.saved, 2);
  assert.deepEqual(res.body.data.unknown, ['TC-KHONG-CO']);
});

test('results status lạ → 400', async () => {
  await request(app).post(`/api/ingest/runs/${runId}/results`).set(KEY)
    .send({ results: [{ code: 'TC-01', status: 'bay-gio-moi-biet' }] }).expect(400);
});

test('finish: status của run tính từ test_results, log tạm bị dọn', async () => {
  const res = await request(app).patch(`/api/ingest/runs/${runId}/finish`).set(KEY).send({}).expect(200);
  assert.equal(res.body.data.status, 'failed'); // có 1 dòng failed
  assert.equal(res.body.data.final_status, null);
  const logs = (await query('SELECT count(*)::int n FROM run_logs WHERE run_id=$1', [runId])).rows[0].n;
  assert.equal(logs, 0);
});

test('finish lần hai → 409', async () => {
  await request(app).patch(`/api/ingest/runs/${runId}/finish`).set(KEY).send({}).expect(409);
});

test('results sau khi finish → 409', async () => {
  await request(app).post(`/api/ingest/runs/${runId}/results`).set(KEY)
    .send({ results: [{ code: 'TC-01', status: 'passed' }] }).expect(409);
});
