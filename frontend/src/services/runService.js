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
// Backend đếm passed/failed/total trên bảng test_results (RunRepository.withStatus) và join
// users để trả tên người chạy, nên không còn chỗ nào phải để trống hay bịa số.
// Run chưa có kết quả nào thì cả ba số là 0 — nơi gọi phân biệt bằng total === 0.
export const toRun = (row = {}) => ({
  id: String(row.run_id ?? row.id),
  name: row.run_name || `Run #${row.run_id}`,
  status: String(row.status ?? 'running').toUpperCase(),
  duration: durationOf(row),
  environment: row.environment || '—',
  executedAt: fmt(row.created_at || row.started_at),
  runBy: row.tester_name || (row.tester_id ? `User #${row.tester_id}` : '—'),
  total: Number(row.total_count ?? 0),
  passed: Number(row.passed_count ?? 0),
  failed: Number(row.failed_count ?? 0),
  // Danh sách case ĐƯỢC LÊN KẾ HOẠCH chạy, không phải kết quả.
  testCodes: row.config_json?.testCodes ?? [],
});

// GET /runs/:id/results -> kết quả TỪNG case, đọc thẳng bảng test_results.
// Thay cho việc bóc pass/fail từ chuỗi log (models/runLog.js): số liệu ở đây khớp đúng
// passed/failed của toRun vì backend lọc cùng một tập (một case = dòng mới nhất của nó).
// `status` ở dạng chữ HOA cho khớp STATUS_STYLE của trang báo cáo.
export const toCaseResult = (row = {}) => ({
  code: String(row.tc_code ?? '').toUpperCase(),
  title: row.title ?? '',
  status: String(row.result_status ?? '').toUpperCase(),
  ms: Number(row.execution_time_ms ?? 0),
  error: row.error_message || null,
  retries: Number(row.retry_count ?? 0),
  // [{ evidence_id, evidence_type: 'screenshot' | 'trace', file_path }]
  evidences: Array.isArray(row.evidences) ? row.evidences : [],
});

export const getRunResults = async (runId) =>
  rows(unwrap(await API.get(`/runs/${runId}/results`))).map(toCaseResult);

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
