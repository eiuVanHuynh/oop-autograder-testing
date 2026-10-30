// Sinh bản báo cáo HTML tự chứa cho một lần chạy.
// Backend chưa có nhóm /reports (routes/reports.routes.js là route rỗng), nên Export làm
// hẳn ở client: không gọi API, không CSS ngoài -> file mở offline được, gửi kèm email được.
// Bỏ file này khi route export của backend lên.

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
// Log chứa thông báo lỗi tuỳ ý (có cả < và &) nên PHẢI escape trước khi ghép vào HTML.
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ESC[c]);

// Báo cáo tự chứa: không gọi API, không CSS ngoài -> mở offline được, gửi kèm email được.
// Backend chưa có nhóm /reports nên export làm hẳn ở client. Khi route đó lên thì bỏ hàm này.
// `cases`: [{ code, title, status, ms, error }] — status/ms/error là null khi log không nói gì.
export function buildReportHtml(run, cases = [], logs = [], { autoPrint = false } = {}) {
  const row = (k, v) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`;
  const done = cases.filter((c) => c.status);
  const count = (st) => done.filter((c) => c.status === st).length;
  const secs = (ms) => (typeof ms === "number" && Number.isFinite(ms) ? `${(ms / 1000).toFixed(1)}s` : "—");
  return `<!doctype html>
<html lang="vi"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Run #${esc(run.id)} — ${esc(run.name)}</title>
<style>
  :root { font: 14px/1.6 "Inter", system-ui, sans-serif; color: #1f2937; }
  body { max-width: 900px; margin: 32px auto; padding: 0 20px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  h2 { font-size: 14px; text-transform: uppercase; letter-spacing: .05em; color: #6b7280; margin: 28px 0 8px; }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; white-space: nowrap; }
  .err { background: #fef2f2; color: #b91c1c; border-radius: 6px; padding: 6px 8px; margin: 6px 0 0; font-size: 11px; white-space: pre-wrap; }
  .PASSED { background: #d1fae5; color: #047857; }
  .FAILED { background: #fee2e2; color: #b91c1c; }
  .RUNNING { background: #fef3c7; color: #b45309; }
  .INTERRUPTED { background: #ffedd5; color: #c2410c; }
  .TIMEDOUT { background: #fee2e2; color: #b91c1c; }
  .SKIPPED { background: #f3f4f6; color: #6b7280; }
  table { border-collapse: collapse; width: 100%; }
  th, td { text-align: left; padding: 6px 10px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
  th { width: 180px; color: #6b7280; font-weight: 500; }
  code, pre { font-family: "JetBrains Mono", ui-monospace, monospace; }
  pre { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; font-size: 12px; white-space: pre-wrap; }
  ul { margin: 0; padding-left: 20px; }
  footer { margin-top: 32px; color: #9ca3af; font-size: 12px; }
  @media print { body { margin: 0; } }
</style>
</head><body>
<h1>${esc(run.name)}</h1>
<p><span class="badge ${esc(run.status)}">${esc(run.status)}</span>
   <code>Run #${esc(run.id)}</code></p>

<h2>Thông tin lần chạy</h2>
<table>
${row("Môi trường", run.environment)}
${row("Thời điểm", run.executedAt || "—")}
${row("Thời lượng", run.duration ?? "—")}
${row("Người chạy", run.runBy)}
${row("Số case trong kế hoạch", run.testCodes.length || "—")}
${done.length ? row("Kết quả", `${count("PASSED")} passed / ${count("FAILED") + count("TIMEDOUT")} failed / ${done.length} đã chạy`) : ""}
</table>

<h2>Test case</h2>
${
  cases.length
    ? `<table>
<tr><th style="width:90px">Mã</th><th style="width:auto">Tên</th><th style="width:120px">Trạng thái</th><th style="width:70px">Thời gian</th></tr>
${cases
  .map(
    (c) => `<tr>
<td><code>${esc(c.code)}</code></td>
<td>${esc(c.title) || "<i>—</i>"}${c.error ? `<p class="err">${esc(c.error)}</p>` : ""}</td>
<td>${c.status ? `<span class="badge ${esc(c.status)}">${esc(c.status)}</span>` : "—"}</td>
<td>${esc(secs(c.ms))}</td>
</tr>`,
  )
  .join("")}
</table>`
    : "<p>Không có mã test nào trong config của lần chạy này.</p>"
}
<p style="color:#6b7280">Trạng thái từng case đọc từ log của lần chạy: bảng <code>test_results</code>
có dữ liệu nhưng chưa có API nào trả ra. Case không có trạng thái là case runner chưa chạy tới.</p>

<h2>Log thực thi</h2>
${logs.length ? `<pre>${esc(logs.join("\n"))}</pre>` : "<p>Không có dòng log nào.</p>"}

<footer>Xuất từ OOP Grader lúc ${esc(new Date().toLocaleString("vi-VN"))}.</footer>
${autoPrint ? "<script>window.print()</script>" : ""}
</body></html>`;
}
