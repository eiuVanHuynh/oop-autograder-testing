import API from '../models/api';

const unwrap = (r) => r?.data?.data ?? r?.data;
const rows = (p) => (Array.isArray(p) ? p : Array.isArray(p?.data) ? p.data : []);

const pad = (n) => String(n).padStart(2, '0');
const fmt = (v) => {
  if (!v) return '';
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? ''
    : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

// Run đang chạy chưa có finished_at -> chưa có thời lượng.
const durationOf = (row) => {
  if (!row.started_at || !row.finished_at) return null;
  const ms = new Date(row.finished_at) - new Date(row.started_at);
  return Number.isFinite(ms) && ms >= 0 ? `${(ms / 1000).toFixed(1)}s` : null;
};

// GET /runs trả { data, meta }; `status` do SQL tính: running | passed | failed | interrupted.
// Số case passed/failed của từng run KHÔNG có trong response (backend chưa có endpoint đọc
// test_results), nên adapter để trống thay vì bịa — nơi gọi phải chịu được giá trị null.
export const toRun = (row = {}) => ({
  id: String(row.run_id ?? row.id),
  name: row.run_name || `Run #${row.run_id}`,
  status: String(row.status ?? 'running').toUpperCase(),
  duration: durationOf(row),
  environment: row.environment || '—',
  executedAt: fmt(row.created_at || row.started_at),
  // tester_id là id; backend chưa join users để trả tên người chạy.
  runBy: row.tester_id ? `User #${row.tester_id}` : '—',
  // Danh sách case ĐƯỢC LÊN KẾ HOẠCH chạy, không phải kết quả.
  testCodes: row.config_json?.testCodes ?? [],
});

// GET /runs?q=&status=&from=&to=&page=&limit=
export const getRuns = async (params = {}) =>
  rows(unwrap(await API.get('/runs', { params }))).map(toRun);

// GET /runs/:id -> một run. 404 nếu không có.
export const getRun = async (runId) => toRun(unwrap(await API.get(`/runs/${runId}`)));

// POST /runs { templateId, env, timeout } -> 202, body là run vừa tạo.
// Lỗi: 403 (không đủ quyền), 404 (template không có), 409 (không có test case 'ready').
export const startRun = async ({ templateId, testIds, env, timeout }) => {
  const body = testIds?.length
    ? { testIds }
    : { templateId: Number(templateId) };
  if (env) body.env = env;
  if (timeout) body.timeout = timeout;
  const run = unwrap(await API.post('/runs', body));
  return { runId: run.run_id ?? run.runId, status: run.status };
};

// POST /runs/:id/rerun -> 202, chạy lại bằng config cũ. Trả về run MỚI.
export const rerunRun = async (runId) => {
  const run = unwrap(await API.post(`/runs/${runId}/rerun`));
  return { runId: run.run_id ?? run.runId, status: run.status };
};

// GET /runs/:id/logs?after= -> { lines: [{ seq, level, message }], nextAfter, status }.
// status: running | passed | failed | interrupted.
export const fetchRunLogs = async (runId, after = 0) => {
  const d = unwrap(await API.get(`/runs/${runId}/logs`, { params: { after } })) || {};
  const lines = d.lines || [];
  return {
    lines: lines.map((l) => `[${String(l.level || 'info').toUpperCase()}] ${l.message}`),
    nextAfter: d.nextAfter ?? after,
    status: d.status,
  };
};

// POST /runs/:id/cancel -> 200. Run đã kết thúc thì 409.
export const cancelRun = async (runId) => {
  await API.post(`/runs/${runId}/cancel`);
};

export function computeStats(list) {
  const finished = list.filter((r) => r.status !== 'RUNNING');
  const passed = finished.filter((r) => r.status === 'PASSED').length;
  const lastFailed = list.find((r) => r.status === 'FAILED'); // list đã sắp mới -> cũ
  return {
    total: list.length,
    passRate: finished.length ? Math.round((passed / finished.length) * 100) : 0,
    running: list.filter((r) => r.status === 'RUNNING').length,
    lastFailed: lastFailed || null,
  };
}

// Pass/Fail theo ngày cho `days` ngày gần nhất (cũ -> mới), bỏ qua run đang chạy.
export function dailyPassFail(list, days = 7) {
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const dayRuns = list.filter((r) => r.executedAt.startsWith(key) && r.status !== 'RUNNING');
    out.push({
      date: `${d.getDate()}/${d.getMonth() + 1}`,
      Pass: dayRuns.filter((r) => r.status === 'PASSED').length,
      Fail: dayRuns.filter((r) => r.status === 'FAILED').length,
    });
  }
  return out;
}
