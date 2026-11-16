// Self-check cho src/models/testSteps.js — hợp đồng giữa form Test Case và bộ chạy test.
//
// Chạy: npm run check      (hoặc riêng file này: node checks/steps.check.mjs)
//
// KHÔNG dùng framework test nào — chỉ `node:assert` có sẵn trong Node, nên không phải
// cài thêm bất cứ dependency nào. Sai thì tiến trình thoát khác 0 và in ra chỗ lệch.
//
// Vì sao cần: `npm run lint` và `npm run build` chỉ bắt lỗi CÚ PHÁP. Những thứ kiểm ở đây
// là hợp đồng với backend và với người dùng — sai thì build vẫn xanh mà giao diện hỏng
// âm thầm. Sửa src/models/testSteps.js thì chạy lại file này.

// Kiểm tra models/testSteps.js bằng ĐÚNG các dòng test_steps/test_data của TC-01 và TC-02.
import assert from 'node:assert/strict';
const M = await import('../src/models/testSteps.js');

// --- bóc field của dòng CŨ: phải khớp regex fieldOf() của runner --------------
// Dòng mới dùng cột field_name; hai hàm này chỉ còn để đọc dữ liệu trước migration 011.
assert.equal(M.parseField('IRN is entered (field username).'), 'username');
assert.equal(M.stripField('IRN is entered (field username).'), 'IRN is entered.');
assert.equal(M.parseField('Login page is displayed.'), '');

// --- target ------------------------------------------------------------------
assert.deepEqual(M.splitTarget('placeholder=e.g. 20521234'), { kind: 'placeholder', value: 'e.g. 20521234' });
assert.deepEqual(M.splitTarget('text=Sign In'), { kind: 'text', value: 'Sign In' });
assert.deepEqual(M.splitTarget('button.submit'), { kind: 'css', value: 'button.submit' }, 'không tiền tố -> CSS');
assert.deepEqual(M.splitTarget('placeholder='), { kind: 'placeholder', value: '' }, 'giữ kind khi value rỗng');
assert.equal(M.targetValueOf('FILL', 'placeholder='), '', 'placeholder= phải coi là CHƯA khai target');
assert.equal(M.targetValueOf('NAVIGATE', '/'), '/', 'NAVIGATE giữ target thô, không bóc tiền tố');

// --- TC-01 thật: 5 bước, VERIFY cuối không target -> cần expected_url --------
const tc01 = [
  { action: 'NAVIGATE', target: '/', expected: 'Login page is displayed.', field: '' },
  { action: 'FILL', target: 'placeholder=e.g. 20521234', expected: 'IRN is entered', field: 'username' },
  { action: 'FILL', target: 'placeholder=Enter your password', expected: 'Password is entered', field: 'password' },
  { action: 'CLICK', target: 'text=Sign In', expected: 'Login request is submitted.', field: '' },
  { action: 'VERIFY', target: '', expected: 'Redirected', field: '' },
];
assert.deepEqual(M.requiredDataFields(tc01), ['username', 'password', 'expected_url']);
assert.deepEqual(M.stepProblems(tc01), [], 'TC-01 đúng khuôn -> không còn vấn đề gì');

// --- TC-02 thật: VERIFY CÓ target -> KHÔNG cần expected_url ------------------
const tc02 = [...tc01.slice(0, 4), { action: 'VERIFY', target: 'text=IRN or password is wrong', expected: '', field: '' }];
assert.deepEqual(M.requiredDataFields(tc02), ['username', 'password']);
assert.deepEqual(M.stepProblems(tc02), []);

// --- các case sai phải bị bắt -------------------------------------------------
assert.equal(M.stepProblems([]).length, 1, 'không có bước nào = lỗi');
const bad = M.stepProblems([{ action: 'Click login button', target: 'x' }]);
assert.equal(bad.length, 1);
assert.equal(bad[0].level, 'error');
assert.match(bad[0].text, /không hiểu action/);

const noTarget = M.stepProblems([{ action: 'FILL', target: '', expected: '', field: 'username' }]);
assert.equal(noTarget.filter((p) => p.level === 'error').length, 1, 'FILL thiếu locator = lỗi');

const noField = M.stepProblems([{ action: 'FILL', target: 'css=#u', expected: 'typed', field: '' }]);
assert.equal(noField.length, 1);
assert.equal(noField[0].level, 'warn', 'thiếu field chỉ là cảnh báo: runner đoán được');

assert.equal(M.stepProblems([{ action: 'NAVIGATE', target: '' }])[0].level, 'error');

// field trùng nhau chỉ đòi test_data một lần
assert.deepEqual(
  M.requiredDataFields([
    { action: 'FILL', target: 'css=#a', field: 'username' },
    { action: 'FILL', target: 'css=#b', field: 'username' },
  ]),
  ['username'],
);

// --- normalizeTarget: khoảng trắng bên trong tiền tố KHÔNG được lọt xuống runner ----
assert.equal(M.normalizeTarget('FILL', 'text=  Sign In  '), 'text=Sign In');
assert.equal(M.normalizeTarget('FILL', 'placeholder='), '', 'chưa khai value -> không có target');
assert.equal(M.normalizeTarget('VERIFY', 'css= #app '), 'css=#app');
assert.equal(M.normalizeTarget('NAVIGATE', '  /login  '), '/login', 'NAVIGATE giữ path thô, chỉ trim');
assert.equal(M.normalizeTarget('NAVIGATE', '   '), '');
// Không prefix -> splitTarget coi là css, nên chuẩn hoá sẽ thêm "css=" (runner hiểu như nhau).
assert.equal(M.normalizeTarget('CLICK', ' button.go '), 'css=button.go');

// --- stepProblems phải đánh số theo chỉ số GỐC, khớp "#n" trên form -----------------
const withBlank = M.stepProblems([
  { action: '', target: '', expected: '' },            // #1 dòng trống, bỏ qua
  { action: 'FILL', target: '', expected: '', field: 'u' }, // #2 thiếu locator
]);
assert.equal(withBlank.length, 1);
assert.match(withBlank[0].text, /Bước #2/, 'phải là #2, không phải #1');

// Toàn dòng trống vẫn là "chưa có bước nào"
assert.match(M.stepProblems([{ action: '  ', target: '' }])[0].text, /chưa có bước nào/);

console.log('testSteps OK');
