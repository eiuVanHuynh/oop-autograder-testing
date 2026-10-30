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

// --- bóc/nhúng field: phải khớp regex fieldOf() của runner --------------------
assert.equal(M.parseField('IRN is entered (field username).'), 'username');
assert.equal(M.stripField('IRN is entered (field username).'), 'IRN is entered.');
// Lưu ý: dấu chấm nằm SAU ngoặc trong dữ liệu seed, nên nhúng lại sẽ thành
// "IRN is entered. (field username)" — chữ cho người đọc xê dịch, regex của runner vẫn đúng.
assert.equal(M.parseField(M.embedField(M.stripField('IRN is entered (field username).'), 'username')), 'username');
assert.equal(M.parseField('Login page is displayed.'), '');
// Nhúng rồi bóc lại phải ra đúng field (vòng tròn khép kín).
const round = M.embedField('Password is entered.', 'lecturer_password');
assert.equal(M.parseField(round), 'lecturer_password');
assert.equal(M.embedField('abc (field old)', 'new'), 'abc (field new)', 'phải thay, không nhân đôi');
assert.equal(M.embedField('abc (field old)', ''), 'abc', 'bỏ field thì gỡ chuỗi');
assert.equal(M.embedField('', 'username'), '(field username)');

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

// --- SQL bắc cầu --------------------------------------------------------------
assert.equal(M.dataInsertSql(0, ['username']), '', 'không có test_id thì không sinh SQL');
assert.equal(M.dataInsertSql(7, []), '');
assert.match(M.dataInsertSql(7, ['username', 'expected_url']), /\(7, 'username', 'TODO', true\),\n  \(7, 'expected_url', 'TODO', true\);$/);
assert.equal(M.dataInsertSql(7, ["x'; DROP TABLE users;--"]), '', 'tên field lạ phải bị loại');

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

// --- SQL có nhắc is_valid cho case âm ------------------------------------------------
assert.match(M.dataInsertSql(7, ['password']), /is_valid = false/);
assert.match(M.dataInsertSql(7, ['password']), /INSERT INTO test_data/);

// --- readyUpdateSql: đường thoát khỏi 'draft' khi chưa có PUT /catalog/cases/:id -----
assert.equal(M.readyUpdateSql(0), '', 'chưa có test_id thì không sinh SQL');
assert.equal(M.readyUpdateSql(12), "UPDATE test_cases SET test_status = 'ready' WHERE test_id = 12;");
// Output được dán thẳng vào psql -> test_id không phải số nguyên dương thì KHÔNG sinh gì,
// thà không có SQL hơn là có SQL rác hoặc SQL do người khác chèn.
assert.equal(M.readyUpdateSql('12; DROP TABLE users'), '');
assert.equal(M.readyUpdateSql(-3), '');
assert.equal(M.readyUpdateSql(1.5), '');
assert.equal(M.readyUpdateSql('12'), "UPDATE test_cases SET test_status = 'ready' WHERE test_id = 12;", 'chuỗi số hợp lệ vẫn dùng được');
assert.equal(M.dataInsertSql('1); DELETE FROM users; --', ['u']), '', 'test_id bẩn -> không sinh INSERT');

console.log('testSteps OK');
