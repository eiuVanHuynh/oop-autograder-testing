// Self-check cho src/models/runLog.js — khuôn dòng log mà backend in ra.
//
// Chạy: npm run check      (hoặc riêng file này: node checks/runlog.check.mjs)
//
// KHÔNG dùng framework test nào — chỉ `node:assert` có sẵn trong Node, nên không phải
// cài thêm bất cứ dependency nào. Sai thì tiến trình thoát khác 0 và in ra chỗ lệch.
//
// Vì sao cần: `npm run lint` và `npm run build` chỉ bắt lỗi CÚ PHÁP. Những thứ kiểm ở đây
// là hợp đồng với backend và với người dùng — sai thì build vẫn xanh mà giao diện hỏng
// âm thầm. Sửa src/models/runLog.js hoặc câu log bên backend thì chạy lại file này.

// Khoá đúng khuôn log mà PlaywrightRunner.js và push-to-backend.js đang in ra.
// Nếu backend đổi thông điệp, test này phải đỏ trước khi giao diện lặng lẽ mất cột trạng thái.
import assert from 'node:assert/strict';
const { parseCaseResults, msLabel, logTone } = await import('../src/models/runLog.js');

// Khuôn chạy local, đúng như fetchRunLogs trả về (đã thêm tiền tố mức log).
const local = [
  '[INFO] [PLAYWRIGHT] 3 test case trên https://x: TC-01, TC-02, TC-31',
  '[INFO] [PLAYWRIGHT] TC-01: 5 bước',
  '[ERROR] [PLAYWRIGHT] TC-01 failed (12043ms): đường dẫn là /, mong đợi /student-(dashboard|history)',
  '[INFO] [PLAYWRIGHT] TC-31 passed (3100ms)',
  '[INFO] [PLAYWRIGHT] Chạy xong.',
];
const r = parseCaseResults(local);
assert.equal(r.size, 2, 'chỉ 2 dòng là dòng kết quả, các dòng khác phải bị bỏ qua');
assert.deepEqual(r.get('TC-01'), {
  status: 'FAILED', ms: 12043,
  error: 'đường dẫn là /, mong đợi /student-(dashboard|history)',
});
assert.deepEqual(r.get('TC-31'), { status: 'PASSED', ms: 3100, error: null }, 'passed không có phần lỗi');

// Khuôn chạy trên GitHub Actions.
const ci = parseCaseResults(['[ERROR] [CI] TC-02 timedOut (30112ms): locator.waitFor: Timeout 30000ms exceeded.']);
assert.deepEqual(ci.get('TC-02'), { status: 'TIMEDOUT', ms: 30112, error: 'locator.waitFor: Timeout 30000ms exceeded.' });

// Lỗi nhiều dòng (err.message của Playwright có "Call log:\n...") không được cắt mất.
const multi = parseCaseResults(['[ERROR] [PLAYWRIGHT] TC-02 timedOut (30112ms): Timeout\nCall log:\n  - waiting for getByText(...)']);
assert.match(multi.get('TC-02').error, /Call log:/);

// Retry: dòng sau đè dòng trước, khớp với test_results chỉ giữ lần cuối.
const retried = parseCaseResults([
  '[ERROR] [PLAYWRIGHT] TC-01 failed (900ms): lần 1',
  '[INFO] [PLAYWRIGHT] TC-01 passed (850ms)',
]);
assert.equal(retried.get('TC-01').status, 'PASSED');

// Không nhận nhầm những dòng không phải kết quả.
assert.equal(parseCaseResults(['[INFO] [PLAYWRIGHT] TC-01: 5 bước']).size, 0);
assert.equal(parseCaseResults(['[INFO] TC-01 passed (10ms)']).size, 0, 'thiếu [PLAYWRIGHT]/[CI] -> bỏ qua');
assert.equal(parseCaseResults(['[INFO] [PLAYWRIGHT] TC-01 exploded (10ms)']).size, 0, 'status lạ -> bỏ qua');
assert.equal(parseCaseResults([]).size, 0);
assert.equal(parseCaseResults(['', null, undefined]).size, 0, 'dòng rỗng không được làm nổ');

assert.equal(msLabel(12043), '12.0s');
assert.equal(msLabel(0), '0.0s');
assert.equal(msLabel(null), null);
assert.equal(msLabel(undefined), null);

// --- logTone: bắt theo TIỀN TỐ, không dò chữ trong nội dung ------------------
assert.equal(logTone('[ERROR] [CI] TC-02 timedOut (1ms)'), 'text-red-600');
assert.equal(logTone('[WARN] [PLAYWRIGHT] Đã hủy.'), 'text-amber-600');
assert.equal(logTone('[INFO] [PLAYWRIGHT] Chạy xong.'), 'text-gray-600');
// Thông báo lỗi có chứa chữ "warn"/"error" ở GIỮA không được tô nhầm.
assert.equal(logTone('[INFO] [PLAYWRIGHT] waiting for warning banner'), 'text-gray-600');
assert.equal(logTone('[INFO] expected SUCCESS'), 'text-gray-600', 'không còn dò chữ SUCCESS');
assert.equal(logTone(''), 'text-gray-600');
assert.equal(logTone(null), 'text-gray-600', 'dòng null không được làm nổ');

console.log('runLog OK');
