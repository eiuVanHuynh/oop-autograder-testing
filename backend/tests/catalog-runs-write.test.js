// Ghi catalog (data + metadata) và đọc test_results: kiểm ở tầng service với repository giả,
// không cần PostgreSQL. Chỉ xét phần có nhánh: 404 và hình dạng dữ liệu trả về.
const test = require('node:test');
const assert = require('node:assert');
const CatalogService = require('../src/services/catalog.service');
const RunsService = require('../src/services/runs.service');
const {
  replaceCaseDataSchema,
  updateCaseSchema,
} = require('../src/validators/catalog.schema');

test('replaceCaseData: null từ repository → 404', async () => {
  const svc = new CatalogService({ catalogRepository: { replaceCaseData: async () => null } });
  await assert.rejects(() => svc.replaceCaseData(9, []), { status: 404 });
});

test('replaceCaseData trả testData dạng camelCase, giữ nguyên env:', async () => {
  const svc = new CatalogService({
    catalogRepository: {
      replaceCaseData: async () => [
        { data_id: 1, test_id: 7, field_name: 'password', data_value: 'env:PW', is_valid: true },
      ],
      // case đang 'draft' → không có gì để hạ
      findCaseDetails: async () => ({ test_id: 7, test_status: 'draft', steps: [], test_data: [] }),
    },
  });
  const out = await svc.replaceCaseData(7, [{ field_name: 'password', data_value: 'env:PW' }]);
  assert.deepEqual(out.testData, [
    { dataId: 1, testId: 7, fieldName: 'password', dataValue: 'env:PW', isValid: true },
  ]);
});

// Case chạy được: 1 bước FILL có field_name và đúng dòng test_data cho field đó.
const runnableCase = {
  test_id: 3,
  steps: [{ step_action: 'FILL', step_target: 'placeholder=x', field_name: 'password' }],
  test_data: [{ field_name: 'password', data_value: 'env:PW', is_valid: true }],
};

test('updateCase: không có dòng nào khớp → 404', async () => {
  const notFound = new CatalogService({
    catalogRepository: { updateCase: async () => null, findCaseDetails: async () => null },
  });
  await assert.rejects(() => notFound.updateCase(9, { title: 'x' }), { status: 404 });
});

test('updateCase: test_status đi tới repository (draft → ready)', async () => {
  let seen = null;
  const svc = new CatalogService({
    catalogRepository: {
      findCaseDetails: async () => runnableCase,
      updateCase: async (id, data) => {
        seen = { id, data };
        return { test_id: id, test_status: 'ready' };
      },
    },
  });
  const out = await svc.updateCase(3, { test_status: 'ready' });
  assert.deepEqual(seen, { id: 3, data: { test_status: 'ready' } });
  assert.equal(out.testStatus, 'READY'); // toApi viết HOA enum cho FE
});

test("updateCase: 'ready' bị chặn khi case chưa chạy được", async () => {
  const noSteps = new CatalogService({
    catalogRepository: {
      findCaseDetails: async () => ({ test_id: 3, steps: [], test_data: [] }),
      updateCase: async () => assert.fail('không được ghi khi case chưa chạy được'),
    },
  });
  await assert.rejects(() => noSteps.updateCase(3, { test_status: 'ready' }), {
    status: 409,
    message: /chưa có bước nào/,
  });

  const noData = new CatalogService({
    catalogRepository: {
      findCaseDetails: async () => ({ ...runnableCase, test_data: [] }),
      updateCase: async () => assert.fail('không được ghi khi thiếu test_data'),
    },
  });
  await assert.rejects(() => noData.updateCase(3, { test_status: 'ready' }), {
    status: 409,
    message: /Thiếu test_data cho field: password/,
  });

  // 'draft' thì không kiểm gì: đó là cách lưu một case còn làm dở.
  const draft = new CatalogService({
    catalogRepository: {
      findCaseDetails: async () => assert.fail('draft không cần kiểm'),
      updateCase: async () => ({ test_id: 3, test_status: 'draft' }),
    },
  });
  assert.equal((await draft.updateCase(3, { test_status: 'draft' })).testStatus, 'DRAFT');
});

test('deleteCaseDataField: case không có → 404, field không có dòng → vẫn 204', async () => {
  const svc = new CatalogService({
    catalogRepository: {
      deleteCaseDataField: async (id) => (Number(id) === 3 ? 0 : null),
      findCaseDetails: async () => ({ test_id: 3, test_status: 'draft', steps: [], test_data: [] }),
    },
  });
  await assert.rejects(() => svc.deleteCaseDataField(9, 'password'), { status: 404 });
  assert.equal(await svc.deleteCaseDataField(3, 'khong_co'), null); // không hạ gì
});

test("sửa steps/data làm case 'ready' hết chạy được thì tự hạ về 'draft'", async () => {
  const written = [];
  const repo = {
    // case đang ready, bước FILL cần field 'username'
    findCaseDetails: async () => ({
      test_id: 5,
      test_status: 'ready',
      steps: [{ step_action: 'FILL', step_target: 'placeholder=IRN', field_name: 'username' }],
      test_data: [],
    }),
    updateCase: async (id, data) => {
      written.push(data);
      return { test_id: id, ...data };
    },
    replaceCaseSteps: async () => [{ step_id: 1, step_order: 0, step_action: 'FILL' }],
  };
  const out = await new CatalogService({ catalogRepository: repo }).replaceCaseSteps(5, []);
  assert.deepEqual(written, [{ test_status: 'draft' }]);
  assert.equal(out.testStatus, 'DRAFT');
  assert.match(out.demotedReason, /Thiếu test_data cho field: username/);
});

test('updateCaseSchema: body rỗng, mã test và status lạ đều bị từ chối', () => {
  assert.equal(updateCaseSchema.safeParse({}).success, false);
  assert.equal(updateCaseSchema.safeParse({ test_status: 'ready' }).success, true);
  assert.equal(updateCaseSchema.safeParse({ test_status: 'xong' }).success, false);
  // tc_code / spec_id là bất biến: gửi lên thì 400, không âm thầm bỏ qua.
  assert.equal(updateCaseSchema.safeParse({ tc_code: 'TC-99' }).success, false);
  assert.equal(updateCaseSchema.safeParse({ spec_id: 2 }).success, false);
});

test('replaceCaseDataSchema chặn hai dòng cùng field_name', () => {
  assert.equal(replaceCaseDataSchema.safeParse({ data: [{ field_name: 'u', data_value: '1' }] }).success, true);
  assert.equal(replaceCaseDataSchema.safeParse({ data: [{ data_value: '1' }] }).success, false);
  const dup = replaceCaseDataSchema.safeParse({
    data: [{ field_name: 'password', data_value: 'dung' }, { field_name: 'password', data_value: 'sai' }],
  });
  assert.equal(dup.success, false);
  assert.match(dup.error.issues[0].message, /gửi hai lần/);
});

const runsDeps = (overrides = {}) => ({
  runRepository: { findById: async () => null },
  templateRepository: {},
  logRepository: {},
  targetResolver: {},
  testRunner: {},
  resultRepository: { findByRun: async () => [] },
  ...overrides,
});

test('getRunResults: run không tồn tại → 404', async () => {
  const svc = new RunsService(runsDeps());
  await assert.rejects(() => svc.getRunResults(42), { status: 404 });
});

test('getRunResults trả nguyên các dòng test_results của run', async () => {
  const rows = [{ execution_id: 1, tc_code: 'TC-01', result_status: 'passed', evidences: [] }];
  const svc = new RunsService(
    runsDeps({
      runRepository: { findById: async () => ({ run_id: 5, status: 'passed', config_json: null }) },
      resultRepository: { findByRun: async (id) => (Number(id) === 5 ? rows : []) },
    }),
  );
  assert.deepEqual(await svc.getRunResults(5), rows);
});

const { toDataMap } = require('../src/repositories/CatalogRepository');

test('toDataMap: hai dòng cùng field_name không im lặng đè nhau theo data_id', () => {
  // TC-02 kiểu "một flow, nhiều bộ dữ liệu": password đúng và password sai có chủ ý.
  const rows = [
    { field_name: 'username', data_value: 'env:IRN', is_valid: true },
    { field_name: 'password', data_value: 'env:PW', is_valid: true },
    { field_name: 'password', data_value: 'Wrong_Password_123', is_valid: false },
  ];
  assert.deepEqual(toDataMap(rows), {
    username: 'env:IRN',
    password: 'Wrong_Password_123', // dòng is_valid = false thắng
  });
  // Đảo thứ tự dòng không đổi kết quả.
  assert.deepEqual(toDataMap([...rows].reverse()).password, 'Wrong_Password_123');
});

test('toDataMap: trong cùng nhóm is_valid thì dòng đầu thắng', () => {
  const rows = [
    { field_name: 'username', data_value: 'dau', is_valid: true },
    { field_name: 'username', data_value: 'sau', is_valid: true },
  ];
  assert.equal(toDataMap(rows).username, 'dau');
});
