// Self-check cho src/models/reportHtml.js — file HTML mà nút Export sinh ra.
//
// Chạy: npm run check      (hoặc riêng file này: node checks/report.check.mjs)
//
// KHÔNG dùng framework test nào — chỉ `node:assert` có sẵn trong Node, nên không phải
// cài thêm bất cứ dependency nào. Sai thì tiến trình thoát khác 0 và in ra chỗ lệch.
//
// Vì sao cần: `npm run lint` và `npm run build` chỉ bắt lỗi CÚ PHÁP. Những thứ kiểm ở đây
// là hợp đồng với backend và với người dùng — sai thì build vẫn xanh mà giao diện hỏng
// âm thầm. Sửa src/models/reportHtml.js thì chạy lại file này.

// Kiểm tra models/reportHtml.js: output là HTML người dùng mở trực tiếp, nên escaping
// là yêu cầu bắt buộc, không phải chi tiết thẩm mỹ.
import assert from 'node:assert/strict';
const { buildReportHtml } = await import('../src/models/reportHtml.js');

const run = {
  id: '4', name: 'Template_SRS Auth - Smoke', status: 'FAILED',
  duration: '38.0s', environment: 'development',
  executedAt: '2026-10-30 10:26:57', runBy: 'User #1',
  testCodes: ['TC-01', 'TC-02', 'TC-31'],
};
const logs = [
  '[INFO] [PLAYWRIGHT] 3 test case trên https://x',
  '[ERROR] [PLAYWRIGHT] TC-01 failed: đường dẫn là /, mong đợi /student-(dashboard|history)',
];

const cases = [
  { code: 'TC-01', title: 'Login with valid IRN', status: 'FAILED', ms: 12043, error: 'đường dẫn là /, mong đợi /student-(dashboard|history)' },
  { code: 'TC-02', title: 'Login with wrong password', status: 'TIMEDOUT', ms: 30112, error: 'Timeout 30000ms exceeded.' },
  { code: 'TC-31', title: 'Sign out', status: 'PASSED', ms: 3100, error: null },
  { code: 'TC-99', title: 'Chưa chạy tới', status: null, ms: null, error: null },
];
const html = buildReportHtml(run, cases, logs);
// Tên case phải vào được báo cáo, không chỉ mã.
assert.match(html, /Login with valid IRN/);
assert.match(html, /class="badge PASSED"/);
assert.match(html, /class="badge TIMEDOUT"/);
assert.match(html, /12\.0s/, 'ms phải đổi ra giây');
// Case chưa có trạng thái không được đếm vào pass hay fail.
assert.match(html, /1 passed \/ 2 failed \/ 3 đã chạy/);
assert.match(html, /^<!doctype html>/, 'phải có doctype, nếu không trình duyệt vào quirks mode');
assert.match(html, /<meta charset="utf-8">/, 'tiếng Việt cần charset');
assert.match(html, /Template_SRS Auth - Smoke/);
assert.match(html, /class="badge FAILED"/);
assert.match(html, /TC-31/);
assert.match(html, /38\.0s/);
assert.match(html, /mong đợi \/student-\(dashboard\|history\)/, 'log phải vào được file');
assert.ok(!html.includes('<script>'), 'không autoPrint thì KHÔNG được có script');

// autoPrint: script phải ở CUỐI body, nếu đặt trên thì print() chạy khi DOM chưa dựng xong.
const p = buildReportHtml(run, cases, logs, { autoPrint: true });
assert.match(p, /<script>window\.print\(\)<\/script>\s*<\/body>/);

// --- escaping: dữ liệu bẩn không được thành thẻ/script -----------------------
const evil = buildReportHtml(
  { ...run, name: '<img src=x onerror=alert(1)>', environment: '"><script>alert(2)</script>' },
  [{ code: 'TC-X', title: '<b>bold</b>', status: 'FAILED', ms: 1, error: '</td><script>alert(4)</script>' }],
  ['[ERROR] expected <b>a & b</b> got </pre><script>alert(3)</script>'],
);
assert.ok(!evil.includes('<script>alert(4)'), 'error của case phải bị escape');
assert.ok(!evil.includes('<b>bold</b>'), 'title của case phải bị escape');
assert.ok(!evil.includes('<img src=x'), 'tên run phải bị escape');
assert.ok(!evil.includes('<script>alert(2)'), 'environment phải bị escape');
assert.ok(!evil.includes('<script>alert(3)'), 'log phải bị escape');
assert.ok(!evil.includes('</pre><script>'), 'log không được thoát khỏi <pre>');
assert.match(evil, /&lt;img src=x/);
assert.match(evil, /a &amp; b/, '& phải thành &amp; chứ không mất');
// Chỉ còn đúng cặp thẻ script của autoPrint (ở đây là 0 vì không bật).
assert.equal((evil.match(/<script/g) || []).length, 0);

// --- các trường rỗng không được làm vỡ file ---------------------------------
const bare = buildReportHtml({ id: 9, name: '', status: 'RUNNING', duration: null, environment: '—', executedAt: '', runBy: '—', testCodes: [] }, [], []);
assert.match(bare, /Không có mã test nào/);
assert.match(bare, /Không có dòng log nào/);
assert.match(bare, /<th>Thời lượng<\/th><td>—<\/td>/, 'duration null -> dấu gạch, không phải "null"');
assert.ok(!bare.includes('null'), 'không được in chữ "null" ra báo cáo');

console.log('reportHtml OK');
