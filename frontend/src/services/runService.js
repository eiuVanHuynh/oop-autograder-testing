import API from '../models/api';
import { buildMockRuns } from '../models/mockData';

// BACKEND-TODO: GET /runs đã có thật, nhưng mỗi dòng chưa kèm số test passed/failed và thời lượng
// mà Dashboard/History đang hiển thị -> tạm giữ dữ liệu mẫu cho hai trang đó.
const runs = buildMockRuns();

export const getRuns = async () => runs;

const unwrap = (r) => r?.data?.data ?? r?.data;

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
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const dayRuns = list.filter((r) => r.executedAt.startsWith(key) && r.status !== 'RUNNING');
    out.push({
      date: `${d.getDate()}/${d.getMonth() + 1}`,
      Pass: dayRuns.filter((r) => r.status === 'PASSED').length,
      Fail: dayRuns.filter((r) => r.status === 'FAILED').length,
    });
  }
  return out;
}
