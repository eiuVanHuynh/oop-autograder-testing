// Users / bugs / environment choice: tested at the service layer with fake repositories, no PostgreSQL needed.
// Only the branching parts — the rules whose breakage nobody would notice right away.
const test = require('node:test');
const assert = require('node:assert');
const UsersService = require('../src/services/users.service');
const BugsService = require('../src/services/bugs.service');
const RunsService = require('../src/services/runs.service');
const TestRunner = require('../src/services/runner/TestRunner');

test('users: an admin cannot demote or lock themselves', async () => {
  const svc = new UsersService({
    userRepository: {
      updateRole: async () => assert.fail('must not write when changing yourself'),
      updateStatus: async () => assert.fail('must not write when locking yourself'),
      findPublicById: async () => ({}),
    },
  });
  await assert.rejects(() => svc.changeRole(7, 'viewer', 7), { status: 400 });
  await assert.rejects(() => svc.changeStatus('7', 'inactive', 7), { status: 400 }); // the id from the URL is a string
});

test('users: unknown user → 404; UPDATE refused (is an admin) → 409', async () => {
  // The UPDATE carries the condition "user_role <> 'admin'", so it returns false in both cases;
  // the service tells them apart by re-reading the row.
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

test('users: create / edit / delete', async () => {
  const admin = { user_id: 2, user_role: 'admin' };
  const svc = (repo) => new UsersService({ userRepository: repo });

  // create: the password must be hashed before it reaches the repository
  let saved;
  const created = await svc({
    create: async (row) => ((saved = row), { user_id: 9, ...row }),
  }).createUser({ fullName: 'A B', email: 'a@b.co', password: 'secret1', role: 'tester' });
  assert.notEqual(saved.password_hash, 'secret1');
  assert.equal(saved.user_role, 'tester');
  assert.equal(created.passwordHash, undefined); // toApi does not leak it
  assert.equal(created.userId, 9);

  // edit: no row → 404
  await assert.rejects(
    () => svc({ updateProfile: async () => null }).updateUser(9, { fullName: 'X Y' }),
    { status: 404 },
  );
  assert.equal(
    (await svc({ updateProfile: async (id, f) => ({ user_id: id, full_name: f.full_name }) })
      .updateUser(9, { fullName: 'X Y' })).fullName,
    'X Y',
  );

  // delete: yourself → 400, an admin → 409, missing → 404
  await assert.rejects(
    () => svc({ deleteNonAdmin: async () => assert.fail('must not delete yourself') }).deleteUser(2, 2),
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

test('users: create/edit schemas', () => {
  const { createUserSchema, updateUserSchema } = require('../src/validators/users.schema');
  assert.equal(createUserSchema.safeParse({ fullName: 'A B', email: 'a@b.co', password: '12345' }).success, false); // < 6
  assert.equal(createUserSchema.parse({ fullName: 'A B', email: 'a@b.co', password: '123456', role: 'TESTER' }).role, 'tester');
  assert.equal(updateUserSchema.safeParse({}).success, false); // an edit with nothing to edit
  assert.equal(updateUserSchema.safeParse({ role: 'admin' }).success, false); // role has its own endpoint

  // email is lowercased in EVERY write schema: uq_users_email in the DB is UNIQUE(email), not
  // UNIQUE(lower(email)) — without normalizing, 'A@b.co' slips through and login picks the wrong row.
  const { registerSchema } = require('../src/validators/auth.schema');
  const bodies = [
    [createUserSchema, { fullName: 'A B', password: '123456' }],
    [updateUserSchema, {}],
    [registerSchema, { fullName: 'A B', password: '123456' }],
  ];
  for (const [schema, rest] of bodies) {
    assert.equal(schema.parse({ ...rest, email: '  ADMIN@EIU.edu.VN ' }).email, 'admin@eiu.edu.vn');
    assert.equal(schema.safeParse({ ...rest, email: 'not-an-email' }).success, false);
  }
});

test('write-side enums also accept the UPPERCASE that toApi returns', () => {
  const { updateBugSchema, bugQuerySchema } = require('../src/validators/bugs.schema');
  const { changeRoleSchema } = require('../src/validators/users.schema');
  // toApi returns {"status":"NEW","severity":"HIGH"}; sending that back verbatim must not be a 400.
  assert.deepEqual(updateBugSchema.parse({ status: 'IN_PROGRESS' }), { status: 'in_progress' });
  assert.deepEqual(bugQuerySchema.parse({ severity: 'HIGH' }), { severity: 'high' });
  assert.deepEqual(changeRoleSchema.parse({ role: 'TESTER' }), { role: 'tester' });
  assert.equal(bugQuerySchema.safeParse({ status: 'garbage' }).success, false);
});

test('GithubActionsRunner only checks the environment name, it does not demand a backend BASE_URL', () => {
  const GithubActionsRunner = require('../src/services/runner/GithubActionsRunner');
  const runner = new GithubActionsRunner({ token: 't', repo: 'o/r' }); // no baseUrls passed
  assert.equal(runner.checkEnv('production'), null); // the secret lives in GitHub, the workflow checks it
  assert.match(runner.checkEnv('prod'), /is not in the list/);
});

test('bugs: only a failed result can produce a bug report', async () => {
  const bugRepository = { createBug: async (data) => ({ bug_id: 1, ...data }) };
  const svc = (result) => new BugsService({ bugRepository, resultRepository: { findById: async () => result } });

  await assert.rejects(
    () => svc(null).createForResult(9, { title: 'x', severity: 'low' }, 1),
    { status: 404 },
  );
  await assert.rejects(
    () => svc({ result_status: 'passed' }).createForResult(1, { title: 'x', severity: 'low' }, 1),
    { status: 409, message: /a bug can only be reported from a Fail result/ },
  );
  for (const status of ['failed', 'timedOut']) {
    const bug = await svc({ result_status: status }).createForResult(1, { title: 'x', severity: 'high' }, 5);
    assert.equal(bug.createdBy, 5);
  }
});

test('TestRunner.requireBaseUrl: a missing BASE_URL_<ENVIRONMENT> names the right variable', () => {
  const runner = new TestRunner({ baseUrls: { staging: 'https://s' } });
  assert.equal(runner.checkEnv('production'), null); // the base class needs no URL (FakeRunner)
  assert.equal(runner.requireBaseUrl('staging'), null);
  assert.match(runner.requireBaseUrl('production'), /BASE_URL_PRODUCTION/);
  assert.equal(runner.baseUrlFor('staging'), 'https://s');
});

test('POST /runs: an environment with no BASE_URL configured → 400, no run created', async () => {
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
    testRunner: { checkEnv: (env) => (env === 'production' ? 'BASE_URL_PRODUCTION is not configured' : null) },
  });

  await assert.rejects(() => svc.createRun(1, { testIds: ['TC-01'], env: 'production' }), {
    status: 400,
    message: /BASE_URL_PRODUCTION/,
  });
  assert.equal(created, false); // blocked BEFORE writing test_runs
});
