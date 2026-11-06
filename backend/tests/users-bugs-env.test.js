// Users / bugs / chọn môi trường: kiểm ở tầng service với repository giả, không cần PostgreSQL.
// Chỉ xét phần có nhánh — những luật mà nếu sai thì không ai thấy ngay.
const test = require('node:test');
const assert = require('node:assert');
const UsersService = require('../src/services/users.service');
const BugsService = require('../src/services/bugs.service');
const RunsService = require('../src/services/runs.service');
const TestRunner = require('../src/services/runner/TestRunner');

test('users: admin không tự hạ quyền / tự khóa mình', async () => {
  const svc = new UsersService({
    userRepository: {
      updateRole: async () => assert.fail('không được ghi khi tự đổi chính mình'),
      updateStatus: async () => assert.fail('không được ghi khi tự khóa chính mình'),
      findPublicById: async () => ({}),
    },
  });
  await assert.rejects(() => svc.changeRole(7, 'viewer', 7), { status: 400 });
  await assert.rejects(() => svc.changeStatus('7', 'inactive', 7), { status: 400 }); // id từ URL là chuỗi
});

test('users: user không tồn tại → 404; UPDATE từ chối (là admin) → 409', async () => {
  // Câu UPDATE có điều kiện "user_role <> 'admin'" nên nó trả false cho cả hai trường hợp;
  // service phân biệt bằng việc đọc lại dòng.
  const svc = (user) =>
    new UsersService({
      userRepository: { updateRole: async () => false, findPublicById: async () => user },
    });

  await assert.rejects(() => svc(null).changeRole(9, 'tester', 1), { status: 404 });
  await assert.rejects(() => svc({ user_id: 2, user_role: 'admin' }).changeRole(2, 'tester', 1), {
    status: 409,
    code: 'ADMIN_PROTECTED',
  });

  const ok = new UsersService({
    userRepository: {
      updateRole: async () => true,
      findPublicById: async (id) => ({ user_id: id, user_role: 'tester' }),
    },
  });
  assert.equal((await ok.changeRole(3, 'tester', 1)).userRole, 'tester');
});

test('users: tạo / sửa / xóa', async () => {
  const admin = { user_id: 2, user_role: 'admin' };
  const svc = (repo) => new UsersService({ userRepository: repo });

  // tạo: mật khẩu phải được băm trước khi tới repository
  let saved;
  const created = await svc({
    create: async (row) => ((saved = row), { user_id: 9, ...row }),
  }).createUser({ fullName: 'A B', email: 'a@b.co', password: 'secret1', role: 'tester' });
  assert.notEqual(saved.password_hash, 'secret1');
  assert.equal(saved.user_role, 'tester');
  assert.equal(created.passwordHash, undefined); // toApi không để lọt
  assert.equal(created.userId, 9);

  // sửa: không có dòng → 404
  await assert.rejects(
    () => svc({ updateProfile: async () => null }).updateUser(9, { fullName: 'X Y' }),
    { status: 404 },
  );
  assert.equal(
    (await svc({ updateProfile: async (id, f) => ({ user_id: id, full_name: f.full_name }) })
      .updateUser(9, { fullName: 'X Y' })).fullName,
    'X Y',
  );

  // xóa: tự xóa mình → 400, admin → 409, không có → 404
  await assert.rejects(
    () => svc({ deleteNonAdmin: async () => assert.fail('không được xóa chính mình') }).deleteUser(2, 2),
    { status: 400 },
  );
  const refused = { deleteNonAdmin: async () => false };
  await assert.rejects(() => svc({ ...refused, findPublicById: async () => admin }).deleteUser(2, 1), {
    status: 409,
    code: 'ADMIN_PROTECTED',
  });
  await assert.rejects(() => svc({ ...refused, findPublicById: async () => null }).deleteUser(9, 1), {
    status: 404,
  });
  assert.equal(await svc({ deleteNonAdmin: async () => true }).deleteUser(9, 1), undefined);
});

test('users: schema tạo/sửa', () => {
  const { createUserSchema, updateUserSchema } = require('../src/validators/users.schema');
  assert.equal(createUserSchema.safeParse({ fullName: 'A B', email: 'a@b.co', password: '12345' }).success, false); // < 6
  assert.equal(createUserSchema.parse({ fullName: 'A B', email: 'a@b.co', password: '123456', role: 'TESTER' }).role, 'tester');
  assert.equal(updateUserSchema.safeParse({}).success, false); // sửa mà không có gì để sửa
  assert.equal(updateUserSchema.safeParse({ role: 'admin' }).success, false); // vai trò có endpoint riêng

  // email hạ chữ ở MỌI schema ghi: uq_users_email ở DB là UNIQUE(email), không phải
  // UNIQUE(lower(email)) — không chuẩn hóa thì 'A@b.co' lọt qua và login chọn sai dòng.
  const { registerSchema } = require('../src/validators/auth.schema');
  const bodies = [
    [createUserSchema, { fullName: 'A B', password: '123456' }],
    [updateUserSchema, {}],
    [registerSchema, { fullName: 'A B', password: '123456' }],
  ];
  for (const [schema, rest] of bodies) {
    assert.equal(schema.parse({ ...rest, email: '  ADMIN@EIU.edu.VN ' }).email, 'admin@eiu.edu.vn');
    assert.equal(schema.safeParse({ ...rest, email: 'khong-phai-email' }).success, false);
  }
});

test('enum phía ghi nhận cả chữ HOA mà toApi trả ra', () => {
  const { updateBugSchema, bugQuerySchema } = require('../src/validators/bugs.schema');
  const { changeRoleSchema } = require('../src/validators/users.schema');
  // toApi trả {"status":"NEW","severity":"HIGH"}; gửi lại y nguyên không được 400.
  assert.deepEqual(updateBugSchema.parse({ status: 'IN_PROGRESS' }), { status: 'in_progress' });
  assert.deepEqual(bugQuerySchema.parse({ severity: 'HIGH' }), { severity: 'high' });
  assert.deepEqual(changeRoleSchema.parse({ role: 'TESTER' }), { role: 'tester' });
  assert.equal(bugQuerySchema.safeParse({ status: 'rác' }).success, false);
});

test('GithubActionsRunner chỉ kiểm tên môi trường, không đòi BASE_URL phía backend', () => {
  const GithubActionsRunner = require('../src/services/runner/GithubActionsRunner');
  const runner = new GithubActionsRunner({ token: 't', repo: 'o/r' }); // không truyền baseUrls
  assert.equal(runner.checkEnv('production'), null); // secret nằm ở GitHub, workflow tự canh
  assert.match(runner.checkEnv('prod'), /không có trong danh sách/);
});

test('bugs: chỉ kết quả Fail mới báo lỗi được', async () => {
  const bugRepository = { createBug: async (data) => ({ bug_id: 1, ...data }) };
  const svc = (result) => new BugsService({ bugRepository, resultRepository: { findById: async () => result } });

  await assert.rejects(
    () => svc(null).createForResult(9, { title: 'x', severity: 'low' }, 1),
    { status: 404 },
  );
  await assert.rejects(
    () => svc({ result_status: 'passed' }).createForResult(1, { title: 'x', severity: 'low' }, 1),
    { status: 409, message: /chỉ báo lỗi được từ kết quả Fail/ },
  );
  for (const status of ['failed', 'timedOut']) {
    const bug = await svc({ result_status: status }).createForResult(1, { title: 'x', severity: 'high' }, 5);
    assert.equal(bug.createdBy, 5);
  }
});

test('TestRunner.requireBaseUrl: thiếu BASE_URL_<MÔI TRƯỜNG> thì nói đúng tên biến', () => {
  const runner = new TestRunner({ baseUrls: { staging: 'https://s' } });
  assert.equal(runner.checkEnv('production'), null); // lớp cơ sở không cần URL (FakeRunner)
  assert.equal(runner.requireBaseUrl('staging'), null);
  assert.match(runner.requireBaseUrl('production'), /BASE_URL_PRODUCTION/);
  assert.equal(runner.baseUrlFor('staging'), 'https://s');
});

test('POST /runs: môi trường chưa cấu hình BASE_URL → 400, không tạo run', async () => {
  let created = false;
  const svc = new RunsService({
    runRepository: {
      findById: async () => null,
      createRun: async () => { created = true; return 1; },
    },
    templateRepository: {},
    logRepository: {},
    resultRepository: {},
    targetResolver: { resolveExplicitTestCodes: async () => ['TC-01'] },
    testRunner: { checkEnv: (env) => (env === 'production' ? 'Chưa cấu hình BASE_URL_PRODUCTION' : null) },
  });

  await assert.rejects(() => svc.createRun(1, { testIds: ['TC-01'], env: 'production' }), {
    status: 400,
    message: /BASE_URL_PRODUCTION/,
  });
  assert.equal(created, false); // chặn TRƯỚC khi ghi test_runs
});
