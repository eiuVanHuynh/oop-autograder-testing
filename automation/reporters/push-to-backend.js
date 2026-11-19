// Reporter đẩy log + kết quả của Playwright về backend qua /api/ingest/*.
// Playwright reporter that pushes logs and results back through /api/ingest/*.
//
// Thay cho test-result-logger.js (ghi thẳng MySQL): backend là nơi duy nhất viết SQL,
// và GitHub Actions không được giữ chuỗi kết nối DB (backend-design.md mục 5).
//
// Hợp đồng: tiêu đề test phải bắt đầu bằng mã test, vd "TC-01 - Login with valid IRN".
const { API_BASE_URL, INGEST_API_KEY, RUN_ID, GITHUB_RUN_ID } = process.env;

const VALID_STATUS = ['passed', 'failed', 'timedOut', 'skipped', 'interrupted'];
const stripAnsi = (s) => String(s).replace(/\u001b\[[0-9;]*m/g, '');
const base = () => `${String(API_BASE_URL).replace(/\/$/, '')}/api/ingest/runs/${RUN_ID}`;

async function send(method, suffix, body) {
  const res = await fetch(base() + suffix, {
    method,
    headers: { 'content-type': 'application/json', 'x-api-key': INGEST_API_KEY },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    // Không ném: mất một lô log không được làm sập cả lần chạy test.
    console.error(`[ingest] ${method} ${suffix} → ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return null;
  }
  return res.json();
}

class PushToBackendReporter {
  constructor() {
    this.results = new Map(); // test.id → kết quả lần chạy cuối (retry ghi đè lần trước)
    this.enabled = Boolean(API_BASE_URL && INGEST_API_KEY && RUN_ID);
    if (!this.enabled) {
      console.warn('[ingest] Thiếu API_BASE_URL / INGEST_API_KEY / RUN_ID — không đẩy kết quả về backend.');
    }
  }

  async onBegin() {
    if (!this.enabled) return;
    // workflow_dispatch không trả id lần chạy, nên backend chỉ biết nó khi CI tự báo về.
    // Không có id này thì POST /runs/:id/cancel không hủy được workflow.
    if (GITHUB_RUN_ID) await send('POST', '/ci-run-id', { ciRunId: String(GITHUB_RUN_ID) });
    await send('POST', '/logs', { lines: [{ level: 'info', message: '[CI] Bắt đầu chạy test.' }] });
  }

  onTestEnd(test, result) {
    const match = test.title.match(/^(TC-[\w-]+)/i);
    if (!match) {
      console.warn(`[ingest] Bỏ qua test không có mã TC- ở đầu tiêu đề: "${test.title}"`);
      return;
    }
    this.results.set(test.id, {
      code: match[1].toUpperCase(),
      status: VALID_STATUS.includes(result.status) ? result.status : 'interrupted',
      ms: Math.round(result.duration || 0),
      error: result.error ? stripAnsi(result.error.message).slice(0, 2000) : null,
    });
  }

  async onEnd(run) {
    if (!this.enabled) return;
    const items = [...this.results.values()];

    if (items.length) {
      const lines = items.map((r) => ({
        level: r.status === 'passed' ? 'info' : 'error',
        message: `[CI] ${r.code} ${r.status} (${r.ms}ms)${r.error ? ': ' + r.error.split('\n')[0] : ''}`,
      }));
      await send('POST', '/logs', { lines });
      await send('POST', '/results', { results: items });
    }

    // final_status để trống: status của run do backend tính từ test_results.
    // Chỉ khi Playwright không chạy nổi test nào (lỗi hạ tầng) mới chốt cứng là 'failed'.
    const finalStatus = items.length ? null : 'failed';
    if (!items.length) {
      await send('POST', '/logs', {
        lines: [{ level: 'error', message: `[CI] Không có kết quả nào (playwright status=${run.status}).` }],
      });
    }
    await send('PATCH', '/finish', { final_status: finalStatus });
  }
}

module.exports = PushToBackendReporter;
