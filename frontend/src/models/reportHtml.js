// Sinh bản báo cáo HTML tự chứa cho một lần chạy.
// Backend chưa có nhóm /reports (routes/reports.routes.js là route rỗng), nên Export làm
// hẳn ở client: không gọi API, không CSS ngoài -> file mở offline được, gửi kèm email được.
// Bỏ file này khi route export của backend lên.

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
// Log chứa thông báo lỗi tuỳ ý (có cả < và &) nên PHẢI escape trước khi ghép vào HTML.
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ESC[c]);

// Ảnh evidence: file_path của Playwright là đường dẫn trên máy chạy test, backend chưa
// serve file nào (app.js không có express.static) -> chỉ nhúng được khi path là URL http.
// shortcut: không có URL thì in khung ảnh trống kèm đường dẫn; bỏ khi backend serve evidence.
const evidenceImg = (e) =>
  /^https?:\/\//i.test(e?.file_path || "")
    ? `<img class="ev" src="${esc(e.file_path)}" alt="${esc(e.evidence_type || "evidence")}">`
    : `<div class="ev ev-none">${e ? `${esc(e.evidence_type || "evidence")}: ${esc(e.file_path)}` : "No evidence"}</div>`;

// Báo cáo tự chứa: không gọi API, không CSS ngoài -> mở offline được, gửi kèm email được.
// Backend chưa có nhóm /reports nên export làm hẳn ở client. Khi route đó lên thì bỏ hàm này.
// `cases`: [{ code, title, status, ms, error, evidences }] — status/ms/error là null khi log không nói gì.
export function buildReportHtml(run, cases = [], logs = [], { autoPrint = false } = {}) {
  const row = (k, v) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`;
  const done = cases.filter((c) => c.status);
  const count = (st) => done.filter((c) => c.status === st).length;
  const secs = (ms) => (typeof ms === "number" && Number.isFinite(ms) ? `${(ms / 1000).toFixed(1)}s` : "—");
  // Một khuôn ô duy nhất cho mọi con số của lần chạy: thời điểm, thời lượng, pass/fail/total.
  const stat = (k, v, cls = "") => `<div class="stat ${cls}"><span class="k">${esc(k)}</span><span class="v ${cls}">${esc(v)}</span></div>`;
  const passed = count("PASSED");
  const failed = count("FAILED") + count("TIMEDOUT");
  // Cả ba ô luôn hiện (kể cả số 0) để mắt đọc được một chỗ cố định; chỉ ẩn cả cụm khi
  // chưa case nào chạy, vì lúc đó 0/0/0 không nói lên điều gì.
  const summary = done.length
    ? stat("Passed", passed, "s-pass") + stat("Failed", failed, "s-fail") + stat("Total", done.length, "s-total")
    : "";
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(run.name)} — ${esc(run.executedAt || "")}</title>
<style>
  /* Màu lấy từ tailwind.config.js của app: brand (xanh ngọc), ink, paper. */
  :root { font: 14px/1.6 "Inter", system-ui, sans-serif; color: #1e2e36; }
  body { max-width: 900px; margin: 32px auto; padding: 0 20px; }
  .head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px;
          padding-bottom: 14px; border-bottom: 3px solid #13646e; }
  h1 { font-size: 22px; margin: 0; color: #0d4d55; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .05em;
       margin: 0 -18px 14px; padding: 9px 18px; background: #13646e; color: #ffffff;
       border-radius: 9px 9px 0 0; }
  section { margin: 24px 0; padding: 0 18px 16px; background: #ffffff;
            border: 1px solid #a8cfd4; border-radius: 10px; }
  .badge { display: inline-block; padding: 3px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; white-space: nowrap; }
  .head .badge { font-size: 15px; padding: 6px 18px; }
  .err { background: #fef2f2; color: #991b1b; border-radius: 6px; padding: 6px 8px; margin: 6px 0 0; font-size: 11px; white-space: pre-wrap; }
  .stats { display: flex; flex-wrap: wrap; gap: 10px; margin: 0 0 12px; }
  .stat { flex: 1 1 0; min-width: 110px; padding: 8px 12px; background: #ffffff;
          border: 1px solid #d7e8ea; border-radius: 8px; }
  .stat .k { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; color: #3b4f59; }
  .stat .v { display: block; font-size: 15px; font-weight: 700; color: #1e2e36; }
  /* Tổng kết: một hàng dồn về phải, ô vuông vức hơn các ô thông tin ở trên. */
  .sum { margin: 12px 0 0; padding-top: 12px; border-top: 1px solid #a8cfd4;
         flex-wrap: nowrap; justify-content: flex-end; }
  .sum .stat { flex: 0 0 auto; min-width: 86px; padding: 8px 10px; border-radius: 4px; text-align: center; }
  .s-pass { color: #047857; } .s-fail { color: #b91c1c; } .s-total { color: #3b4f59; }
  .stat.s-pass { background: #ecfdf5; border-color: #6ee7b7; }
  .stat.s-fail { background: #fef2f2; border-color: #fca5a5; }
  .stat.s-total { background: #f3f4f6; border-color: #d1d5db; }
  .PASSED { background: #d1fae5; color: #065f46; }
  .FAILED { background: #fee2e2; color: #991b1b; }
  .RUNNING { background: #fef3c7; color: #92400e; }
  .INTERRUPTED { background: #ffedd5; color: #9a3412; }
  .TIMEDOUT { background: #fee2e2; color: #991b1b; }
  .SKIPPED { background: #f3f4f6; color: #374151; }
  table { border-collapse: collapse; width: 100%; }
  th, td { text-align: left; padding: 6px 10px; border-bottom: 1px solid #d7e8ea; vertical-align: top; }
  th { width: 180px; color: #3b4f59; font-weight: 600; }
  code, pre { font-family: "JetBrains Mono", ui-monospace, monospace; }
  pre { background: #f6f6f4; border: 1px solid #d7e8ea; border-radius: 8px; padding: 8px 10px;
        margin: 0; font-size: 12px; line-height: 1.45; color: #1e2e36; white-space: pre-wrap; }
  .case { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;
          padding: 12px 14px; margin-bottom: 8px; background: #ffffff;
          border: 1px solid #d7e8ea; border-radius: 8px;
          box-shadow: 0 1px 2px rgba(30, 46, 54, .07); }
  .c-name { margin: 0; font-weight: 600; }
  .c-side { flex: 0 0 auto; display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
  /* Thời gian dùng chung khuôn badge với trạng thái, chỉ khác tông xám nhạt. */
  .badge.ms { background: #f3f4f6; color: #4b5563; font-family: "JetBrains Mono", ui-monospace, monospace; }
  .evs { margin-top: 8px; font-size: 11px; }
  .evs > summary { cursor: pointer; color: #13646e; font-weight: 600; }
  .evlist { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
  .ev { max-width: 320px; max-height: 220px; border: 1px solid #a8cfd4; border-radius: 6px; }
  .ev-none { display: flex; align-items: center; justify-content: center; text-align: center;
             width: 160px; height: 90px; padding: 6px; box-sizing: border-box;
             background: #f6f6f4; border: 1px dashed #a8cfd4; border-radius: 6px;
             color: #3b4f59; font-size: 10px; word-break: break-all; overflow: hidden; }
  ul { margin: 0; padding-left: 20px; }
  footer { margin-top: 32px; color: #3b4f59; font-size: 12px; }
  @media print { body { margin: 0; } .ev { max-height: 160px; } }
</style>
</head><body>
<header class="head">
  <h1>${esc(run.name)}</h1>
  <span class="badge ${esc(run.status)}">${esc(run.status)}</span>
</header>

<section class="info">
<h2>Run information</h2>
<div class="stats">${stat("Executed at", run.executedAt || "—")}${stat("Duration", run.duration ?? "—")}</div>
<table>
${row("Environment", run.environment)}
${row("Tester", run.runBy)}
${row("Planned tests", run.testCodes.length || "—")}
</table>
${summary ? `<div class="stats sum">${summary}</div>` : ""}
</section>

<section class="cases">
<h2>Test cases</h2>
${
  cases.length
    ? cases
        .map(
          (c) => `<div class="case">
<div>
<p class="c-name">${esc(c.title) || `<code>${esc(c.code)}</code>`}</p>${c.error ? `<p class="err">${esc(c.error)}</p>` : ""}
<details class="evs"><summary>Evidence (${c.evidences?.length || 0})</summary>
<div class="evlist">${(c.evidences?.length ? c.evidences : [null]).map(evidenceImg).join("")}</div></details>
</div>
<div class="c-side">${c.status ? `<span class="badge ${esc(c.status)}">${esc(c.status)}</span>` : "—"}<span class="badge ms">${esc(secs(c.ms))}</span></div>
</div>`,
        )
        .join("")
    : "<p>This run has no test code in its config.</p>"
}
<p style="color:#3b4f59">A case without a status is a case the runner never reached.</p>
</section>

<section class="log">
<h2>Execution log</h2>
${logs.length ? `<pre>${esc(logs.join("\n"))}</pre>` : "<p>No log line recorded.</p>"}
</section>

<footer>Exported from OOP Grader at ${esc(new Date().toLocaleString("vi-VN"))}.</footer>
${autoPrint ? "<script>window.print()</script>" : ""}
</body></html>`;
}
