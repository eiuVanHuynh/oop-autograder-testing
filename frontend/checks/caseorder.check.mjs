// Self-check cho src/models/caseOrder.js — thứ tự chạy test case trong template (issue #67).
//
// Chạy: npm run check      (hoặc riêng: node checks/caseorder.check.mjs)
//
// Vì sao cần: thứ tự sai thì build vẫn xanh, giao diện vẫn hiện danh sách, nhưng test chạy
// sai thứ tự — lỗi chỉ lộ ra khi một case phụ thuộc case trước (đăng nhập rồi mới tạo dữ liệu).
import assert from 'node:assert/strict';
const { splitCodes, joinCodes, moveAt } = await import('../src/models/caseOrder.js');

// splitCodes GIỮ NGUYÊN thứ tự đã nhập, không sort.
assert.deepEqual(splitCodes('TC-31, TC-01 ,TC-02'), ['TC-31', 'TC-01', 'TC-02']);
assert.deepEqual(splitCodes(''), []);
assert.deepEqual(splitCodes(null), []);
assert.deepEqual(splitCodes('TC-01,,  , TC-02'), ['TC-01', 'TC-02']);
// Mã trùng bị bỏ, giữ lần xuất hiện ĐẦU: hai <li key={code}> giống nhau làm nút ↑/↓ đổi sai dòng.
assert.deepEqual(splitCodes('TC-02, TC-01, TC-02'), ['TC-02', 'TC-01']);

// Đi một vòng chuỗi -> mảng -> chuỗi không được đổi thứ tự.
assert.equal(joinCodes(splitCodes('TC-31,TC-01')), 'TC-31, TC-01');

const list = ['A', 'B', 'C'];
assert.deepEqual(moveAt(list, 1, 0), ['B', 'A', 'C']); // lên
assert.deepEqual(moveAt(list, 1, 2), ['A', 'C', 'B']); // xuống
assert.deepEqual(moveAt(list, 0, -1), list);           // nút ↑ ở dòng đầu: không đổi
assert.deepEqual(moveAt(list, 2, 3), list);            // nút ↓ ở dòng cuối: không đổi
assert.deepEqual(list, ['A', 'B', 'C']);               // không sửa mảng gốc

console.log('caseOrder OK');
