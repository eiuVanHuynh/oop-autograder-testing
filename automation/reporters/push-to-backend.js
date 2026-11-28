// Reporter đẩy log + kết quả của Playwright về backend qua /api/ingest/*.
// Playwright reporter that pushes logs and results back through /api/ingest/*.
//
// Thay cho test-result-logger.js (ghi thẳng MySQL): backend là nơi duy nhất viết SQL,
// và GitHub Actions không được giữ chuỗi kết nối DB (backend-design.md mục 5).
//
// Hợp đồng: tiêu đề test phải bắt đầu bằng mã test, vd "TC-01 - Login with valid IRN".
const fs = require('node:fs/promises');

const { API_BASE_URL, INGEST_API_KEY, RUN_ID, GITHUB_RUN_ID } = process.env;

const VALID_STATUS = ['passed', 'failed', 'timedOut', 'skipped', 'interrupted'];
const stripAnsi = (s) => String(s).replace(/\u001b\[[0-9;]*m/g, '');
const apiRoot = () => String(API_BASE_URL).replace(/\/$/, '');
const base = () => `${apiRoot()}/api/ingest/runs/${RUN_ID}`;

// Bằng chứng gửi kèm cho case KHÔNG pass: ảnh gửi cả file (base64) để trang báo cáo hiện được ảnh,
// trace chỉ gửi đường dẫn vì file zip nặng vài MB. Case pass thì ảnh không ai mở, và 28 ảnh mỗi lần
// chạy nằm trong Postgres thì tốn chỗ vô ích.
// Trần 1.1 MB khớp MAX_DATA_CHARS của backend (validators/ingest.schema.js) và giới hạn 2mb JSON của app.js.
const MAX_EVIDENCE_BYTES = 1_100_000;
const EVIDENCE_NAMES = { screenshot: 'screenshot', trace: 'trace' };

async function send(method, suffix, body) {
  return sendTo(base() + suffix, method, suffix, body);
}

async function sendTo(url, method, label, body) {
  const res = await fetch(url, {
    method,
    headers: { 'content-type': 'application/json', 'x-api-key': INGEST_API_KEY },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    // Không ném: mất một lô log không được làm sập cả lần chạy test.
    console.error(`[ingest] ${method} ${label} → ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return null;
  }
  return res.json();
}

// Đọc file Playwright để lại (ảnh/trace) thành base64. Trả null khi file đã mất hoặc quá nặng —
// thiếu một ảnh không được làm hỏng cả lượt đẩy kết quả.
async function readAsBase64(file) {
  try {
    const stat = await fs.stat(file);
    if (stat.size > MAX_EVIDENCE_BYTES) {
      console.warn(`[ingest] Bỏ qua bằng chứng ${stat.size} byte (> ${MAX_EVIDENCE_BYTES}): ${file}`);
      return null;
    }
    return (await fs.readFile(file)).toString('base64');
  } catch (err) {
    console.warn(`[ingest] Không đọc được bằng chứng ${file}: ${err.message}`);
    return null;
  }
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
    await send('POST', '/logs', { lines: [{ level: 'info', message: '[CI] Test run started.' }] });
  }

  onTestEnd(test, result) {
    const match = test.title.match(/^(TC-[\w-]+)/i);
    if (!match) {
      console.warn(`[ingest] Bỏ qua test không có mã TC- ở đầu tiêu đề: "${test.title}"`);
      return;
    }
    const status = VALID_STATUS.includes(result.status) ? result.status : 'interrupted';
    this.results.set(test.id, {
      code: match[1].toUpperCase(),
      status,
      ms: Math.round(result.duration || 0),
      error: result.error ? stripAnsi(result.error.message).slice(0, 2000) : null,
      // Giữ ngoài phần gửi lên /results (backend không nhận field này), đẩy riêng ở onEnd khi đã biết
      // execution_id. Lần retry ghi đè lần trước, nên chỉ còn bằng chứng của lần chạy cuối — khớp với
      // kết quả cuối cùng mà báo cáo hiện.
      attachments:
        status === 'passed'
          ? []
          : (result.attachments || [])
              .filter((a) => EVIDENCE_NAMES[a.name] && a.path)
              // Cắt đuôi 500 ký tự: file_path là VARCHAR(500), đường dẫn dài hơn sẽ bị validator
              // trả 400 và mất luôn ảnh. Giữ phần cuối vì tên file nói nhiều hơn tiền tố thư mục.
              .map((a) => ({
                type: EVIDENCE_NAMES[a.name],
                path: a.path.slice(-500),
                mime: a.contentType,
              })),
    });
  }

  // Đẩy ảnh/trace của từng case sau khi /results trả về execution_id.
  // Mỗi result một request: 2mb JSON mỗi lần (app.js) không đủ cho cả lượt, và một ảnh lỗi
  // không được kéo theo ảnh của case khác.
  async pushEvidences(results, byCode) {
    for (const r of results) {
      const id = byCode.get(r.code);
      if (!id || !r.attachments.length) continue;

      const items = [];
      for (const a of r.attachments) {
        // Trace là zip vài MB: chỉ ghi đường dẫn trong artifact của GitHub Actions, không nhúng vào DB.
        const data = a.type === 'screenshot' ? await readAsBase64(a.path) : null;
        items.push(data ? { type: a.type, path: a.path, data, mime: a.mime } : { type: a.type, path: a.path });
      }

      await sendTo(
        `${apiRoot()}/api/ingest/results/${id}/evidences`,
        'POST',
        `/results/${id}/evidences`,
        { evidences: items },
      );
    }
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
      // Chỉ gửi các field backend nhận (addResultsSchema); attachments đi đường riêng bên dưới.
      const saved = await send('POST', '/results', {
        results: items.map(({ code, status, ms, error }) => ({ code, status, ms, error })),
      });

      // execution_id chỉ có ở đây: route đọc kết quả (/runs/:id/results) đòi JWT người dùng, CI không có.
      const byCode = new Map(
        (saved?.data?.results || []).map((r) => [String(r.code).toUpperCase(), r.executionId]),
      );
      if (byCode.size) await this.pushEvidences(items, byCode);
    }

    // final_status để trống: status của run do backend tính từ test_results.
    // Chỉ khi Playwright không chạy nổi test nào (lỗi hạ tầng) mới chốt cứng là 'failed'.
    const finalStatus = items.length ? null : 'failed';
    if (!items.length) {
      await send('POST', '/logs', {
        lines: [{ level: 'error', message: `[CI] No result reported (playwright status=${run.status}).` }],
      });
    }
    await send('PATCH', '/finish', { final_status: finalStatus });
  }
}

module.exports = PushToBackendReporter;
