// Self-check cho src/models/searchTags.js — luật biến chữ trong ô search thành tag filter.
//
// Chạy: npm run check      (hoặc riêng file này: node checks/searchtags.check.mjs)
//
// Chỉ `node:assert` có sẵn trong Node, không framework, không dependency mới.
//
// Vì sao cần: parse sai một token thì người dùng thấy bảng trống mà không hiểu vì sao —
// build vẫn xanh. Khoá bốn thứ dễ vỡ: cụm nhiều từ, tag nằm giữa chuỗi, round-trip với
// panel Filter, và việc không gợi lại tag đã tick.
import assert from 'node:assert/strict';
const { parseQuery, buildQuery, suggestTags, textAfterPick, pickedTags } =
  await import('../src/models/searchTags.js');

const GROUPS = [
  { key: 'status', label: 'Status', options: ['ready', 'draft', 'deprecated'] },
  { key: 'type', label: 'Type', options: ['ui', 'api'] },
  {
    key: 'env',
    label: 'Environment',
    options: [
      { value: 'testing', label: 'Testing Sandbox' },
      { value: 'staging', label: 'Staging Lab' },
    ],
  },
];

// 1. Tag + free text, tag nằm cả ở đầu và ở giữa chuỗi.
assert.deepEqual(parseQuery('ready login api form', GROUPS), {
  filters: { status: ['ready'], type: ['api'], env: [] },
  text: 'login form',
});

// 2. Label nhiều từ phải ăn nguyên cụm, KHÔNG bị cắt thành tag "Testing" rồi để lại "Sandbox".
assert.deepEqual(parseQuery('Testing Sandbox smoke', GROUPS), {
  filters: { status: [], type: [], env: ['testing'] },
  text: 'smoke',
});

// 3. Khớp không phân biệt hoa thường, nhưng chỉ khớp cả từ: "readyX" là free text.
assert.deepEqual(parseQuery('READY readyX', GROUPS).filters.status, ['ready']);
assert.equal(parseQuery('READY readyX', GROUPS).text, 'readyX');

// 4. Round-trip: tick tay trong FilterMenu -> chuỗi search -> parse lại ra đúng filter đó.
const q = buildQuery({ status: ['draft'], type: ['ui'], env: [] }, 'login', GROUPS);
assert.equal(q, 'draft ui login');
assert.deepEqual(parseQuery(q, GROUPS), {
  filters: { status: ['draft'], type: ['ui'], env: [] },
  text: 'login',
});
assert.equal(buildQuery({}, '', GROUPS), '', 'không tag, không chữ -> chuỗi rỗng');

// 4b. Dấu cách đang gõ dở phải sống sót qua parse->build, nếu không thì không gõ nổi
// cụm nhiều từ: "login " bị trim thành "login" rồi ký tự tiếp theo dính liền.
const typing = buildQuery({ status: ['ready'] }, 'login ', GROUPS);
assert.equal(typing, 'ready login ');
assert.equal(parseQuery(typing, GROUPS).text, 'login ');
assert.equal(parseQuery('ready login form', GROUPS).text, 'login form');

// 5. Gợi ý: bỏ tag đã tick, khớp theo từ đang gõ dở, tôn trọng limit.
const s = suggestTags('rea', { status: [], type: [], env: [] }, GROUPS);
assert.deepEqual(s.map((o) => o.value), ['ready']);
assert.equal(
  suggestTags('rea', { status: ['ready'], type: [], env: [] }, GROUPS).length,
  0,
  'tag đã tick thì không gợi lại',
);
assert.equal(suggestTags('', {}, GROUPS).length, 7, 'chưa gõ gì -> gợi tất cả');
assert.equal(suggestTags('', {}, GROUPS, 2).length, 2);
assert.equal(
  suggestTags('sand', {}, GROUPS)[0].groupLabel,
  'Environment',
  'mỗi gợi ý mang theo tên nhóm để hiện bên phải dòng',
);

// 6. Chip vẽ trong ô search: đúng tag đang tick, mang label + nhóm, theo thứ tự group.
assert.deepEqual(
  pickedTags({ env: ['testing'], status: ['ready'] }, GROUPS).map((o) => [o.label, o.groupLabel]),
  [['ready', 'Status'], ['Testing Sandbox', 'Environment']],
);
assert.deepEqual(pickedTags({}, GROUPS), []);

// 7. Chọn tag thì bỏ phần gõ dở, nhưng giữ lại chữ không liên quan.
assert.equal(textAfterPick('login rea', 'ready'), 'login');
assert.equal(textAfterPick('login', 'ready'), 'login');
assert.equal(textAfterPick('', 'ready'), '');

console.log('searchTags.js OK');
