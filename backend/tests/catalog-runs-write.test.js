// Catalog writes (data + metadata) and reading test_results: tested at the service layer with fake repositories,
// no PostgreSQL needed. Only the branching parts: 404s and the shape of the returned data.
const test = require('node:test');
const assert = require('node:assert');
const CatalogService = require('../src/services/catalog.service');
const RunsService = require('../src/services/runs.service');
const {
  replaceCaseDataSchema,
  updateCaseSchema,
} = require('../src/validators/catalog.schema');

test('replaceCaseData: null from the repository → 404', async () => {
  const svc = new CatalogService({ catalogRepository: { replaceCaseData: async () => null } });
  await assert.rejects(() => svc.replaceCaseData(9, []), { status: 404 });
});

test('replaceCaseData returns testData in camelCase, keeping env: untouched', async () => {
  const svc = new CatalogService({
    catalogRepository: {
      replaceCaseData: async () => [
        { data_id: 1, test_id: 7, field_name: 'password', data_value: 'env:PW', is_valid: true },
      ],
      // the case is 'draft' → there is nothing to downgrade
      findCaseDetails: async () => ({ test_id: 7, test_status: 'draft', steps: [], test_data: [] }),
    },
  });
  const out = await svc.replaceCaseData(7, [{ field_name: 'password', data_value: 'env:PW' }]);
  assert.deepEqual(out.testData, [
    { dataId: 1, testId: 7, fieldName: 'password', dataValue: 'env:PW', isValid: true },
  ]);
});

// A runnable case: 1 FILL step with a field_name and the matching test_data row for that field.
const runnableCase = {
  test_id: 3,
  steps: [{ step_action: 'FILL', step_target: 'placeholder=x', field_name: 'password' }],
  test_data: [{ field_name: 'password', data_value: 'env:PW', is_valid: true }],
};

test('updateCase: no matching row → 404', async () => {
  const notFound = new CatalogService({
    catalogRepository: { updateCase: async () => null, findCaseDetails: async () => null },
  });
  await assert.rejects(() => notFound.updateCase(9, { title: 'x' }), { status: 404 });
});

test('updateCase: test_status reaches the repository (draft → ready)', async () => {
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
  assert.equal(out.testStatus, 'READY'); // toApi uppercases enums for the FE
});

test("updateCase: 'ready' is blocked while the case is not runnable", async () => {
  const noSteps = new CatalogService({
    catalogRepository: {
      findCaseDetails: async () => ({ test_id: 3, steps: [], test_data: [] }),
      updateCase: async () => assert.fail('must not write while the case is not runnable'),
    },
  });
  await assert.rejects(() => noSteps.updateCase(3, { test_status: 'ready' }), {
    status: 409,
    message: /has no steps/,
  });

  const noData = new CatalogService({
    catalogRepository: {
      findCaseDetails: async () => ({ ...runnableCase, test_data: [] }),
      updateCase: async () => assert.fail('must not write when test_data is missing'),
    },
  });
  await assert.rejects(() => noData.updateCase(3, { test_status: 'ready' }), {
    status: 409,
    message: /Missing test_data for field: password/,
  });

  // 'draft' checks nothing: that is how an unfinished case is saved.
  const draft = new CatalogService({
    catalogRepository: {
      findCaseDetails: async () => assert.fail('draft needs no check'),
      updateCase: async () => ({ test_id: 3, test_status: 'draft' }),
    },
  });
  assert.equal((await draft.updateCase(3, { test_status: 'draft' })).testStatus, 'DRAFT');
});

test('deleteCaseDataField: missing case → 404, a field with no rows → still 204', async () => {
  const svc = new CatalogService({
    catalogRepository: {
      deleteCaseDataField: async (id) => (Number(id) === 3 ? 0 : null),
      findCaseDetails: async () => ({ test_id: 3, test_status: 'draft', steps: [], test_data: [] }),
    },
  });
  await assert.rejects(() => svc.deleteCaseDataField(9, 'password'), { status: 404 });
  assert.equal(await svc.deleteCaseDataField(3, 'missing_field'), null); // nothing downgraded
});

test("editing steps/data that makes a 'ready' case unrunnable drops it back to 'draft'", async () => {
  const written = [];
  const repo = {
    // the case is ready, and the FILL step needs the 'username' field
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
  assert.match(out.demotedReason, /Missing test_data for field: username/);
});

test('updateCaseSchema: an empty body, a test code and an unknown status are all rejected', () => {
  assert.equal(updateCaseSchema.safeParse({}).success, false);
  assert.equal(updateCaseSchema.safeParse({ test_status: 'ready' }).success, true);
  assert.equal(updateCaseSchema.safeParse({ test_status: 'xong' }).success, false);
  // tc_code / spec_id are immutable: sending them is a 400, not a silent drop.
  assert.equal(updateCaseSchema.safeParse({ tc_code: 'TC-99' }).success, false);
  assert.equal(updateCaseSchema.safeParse({ spec_id: 2 }).success, false);
});

test('replaceCaseDataSchema blocks two rows with the same field_name', () => {
  assert.equal(replaceCaseDataSchema.safeParse({ data: [{ field_name: 'u', data_value: '1' }] }).success, true);
  assert.equal(replaceCaseDataSchema.safeParse({ data: [{ data_value: '1' }] }).success, false);
  const dup = replaceCaseDataSchema.safeParse({
    data: [{ field_name: 'password', data_value: 'right' }, { field_name: 'password', data_value: 'wrong' }],
  });
  assert.equal(dup.success, false);
  assert.match(dup.error.issues[0].message, /was sent twice/);
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

test('getRunResults: unknown run → 404', async () => {
  const svc = new RunsService(runsDeps());
  await assert.rejects(() => svc.getRunResults(42), { status: 404 });
});

test('getRunResults returns the run test_results rows as they are', async () => {
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

test('toDataMap: two rows with the same field_name do not silently override by data_id', () => {
  // A TC-02 style "one flow, several data sets": a correct password and a deliberately wrong one.
  const rows = [
    { field_name: 'username', data_value: 'env:IRN', is_valid: true },
    { field_name: 'password', data_value: 'env:PW', is_valid: true },
    { field_name: 'password', data_value: 'Wrong_Password_123', is_valid: false },
  ];
  assert.deepEqual(toDataMap(rows), {
    username: 'env:IRN',
    password: 'Wrong_Password_123', // the is_valid = false row wins
  });
  // Reversing the row order does not change the result.
  assert.deepEqual(toDataMap([...rows].reverse()).password, 'Wrong_Password_123');
});

test('toDataMap: within the same is_valid group the first row wins', () => {
  const rows = [
    { field_name: 'username', data_value: 'dau', is_valid: true },
    { field_name: 'username', data_value: 'sau', is_valid: true },
  ];
  assert.equal(toDataMap(rows).username, 'dau');
});
