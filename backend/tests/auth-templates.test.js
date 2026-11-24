// Tests Auth + Templates over HTTP without PostgreSQL: pg is replaced by in-memory tables.
// Must run BEFORE require('../src/app') because the app wires up db at require time.
// The stub takes $n placeholders, not ?, so any query left with MySQL syntax shows up.
const Module = require('module');
const origLoad = Module._load;
let templates = [];
let users = [];
let nextId = 1;
let lastSql = [];   // to assert RETURNING and the parameter types

Module._load = function (req) {
  if (req === 'pg') {
    return {
      Pool: class {
        async query(sql, p = []) {
          const s = sql.trim();
          lastSql.push({ sql: s, params: p });
          if (s.startsWith('INSERT')) {
            templates.push({
              template_id: nextId,
              template_name: p[0], description: p[1], scope: p[2],
              target_json: p[3], env: p[4], timeout: p[5], status: p[6], created_by: p[7],
            });
            return { rows: [{ template_id: nextId++ }], rowCount: 1 };
          }
          if (s.startsWith('DELETE')) {
            const before = templates.length;
            templates = templates.filter((t) => t.template_id !== Number(p[0]));
            return { rows: [], rowCount: before - templates.length };
          }
          if (s.startsWith('UPDATE')) return { rows: [], rowCount: 1 };
          // requireAuth looks up by user_id, login looks up by email
          if (s.includes('FROM users') && s.includes('user_id = $1')) {
            return { rows: users.filter((u) => u.user_id === Number(p[0])), rowCount: 0 };
          }
          if (s.includes('FROM users')) {
            return { rows: users.filter((u) => u.email === p[0]), rowCount: 0 };
          }
          if (s.includes('WHERE template_name = $1')) {
            return { rows: templates.filter((t) => t.template_name === p[0]), rowCount: 0 };
          }
          if (s.includes('template_id = $1')) {
            return { rows: templates.filter((t) => t.template_id === Number(p[0])), rowCount: 0 };
          }
          return { rows: templates, rowCount: templates.length };
        }
      },
    };
  }
  return origLoad.apply(this, arguments);
};

process.env.DATABASE_URL = 'postgresql://u:p@localhost:5432/test';
process.env.JWT_SECRET = 'test-secret';

const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = require('../src/app');

const PASSWORD = 'Test@1234';
const HASH = bcrypt.hashSync(PASSWORD, 4); // low cost for speed, tests only

// Column names from the real schema: user_role / user_status (not role / status).
const seedUser = (over = {}) => {
  const user = {
    user_id: users.length + 1,
    full_name: 'Demo',
    email: `u${users.length + 1}@eiu.edu.vn`,
    password_hash: HASH,
    auth_provider: 'LOCAL',
    user_role: 'tester',
    user_status: 'active',
    ...over,
  };
  users.push(user);
  return user;
};

const tokenFor = (user) =>
  jwt.sign({ user_id: user.user_id, role: user.user_role }, 'test-secret');

const auth = (user) => ['Authorization', `Bearer ${tokenFor(user)}`];

const newTemplate = { template_name: 'Smoke UI', target_json: { suiteId: 1 } };

test.beforeEach(() => { templates = []; users = []; nextId = 1; lastSql = []; });

// ---------- Templates: business rules ----------

test('POST /api/templates creates a template and returns 201', async () => {
  const tester = seedUser({ user_role: 'tester' });
  const res = await request(app).post('/api/templates').set(...auth(tester)).send(newTemplate);
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.data.template_name, 'Smoke UI');
  // target_json must come back as an object, not a JSON string
  assert.deepStrictEqual(res.body.data.target_json, { suiteId: 1 });
  // created_by comes from the token, not from a default
  assert.strictEqual(res.body.data.created_by, tester.user_id);
});

test('POST /api/templates with a duplicate name returns 409', async () => {
  const tester = seedUser();
  await request(app).post('/api/templates').set(...auth(tester)).send(newTemplate);
  const res = await request(app).post('/api/templates').set(...auth(tester)).send(newTemplate);
  assert.strictEqual(res.status, 409);
});

test('POST /api/templates without target_json returns 400 with details', async () => {
  const tester = seedUser();
  const res = await request(app).post('/api/templates').set(...auth(tester))
    .send({ template_name: 'No target', target_json: { testIds: [] } });
  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');
  assert.ok(Array.isArray(res.body.error.details));
});

test('GET /api/templates/:id for a missing id returns 404 instead of hanging', async () => {
  const res = await request(app).get('/api/templates/999').set(...auth(seedUser()));
  assert.strictEqual(res.status, 404);
  assert.strictEqual(res.body.error.message, 'Template not found');
});

test('POST /api/templates/:id/duplicate names it (Copy) and returns 201', async () => {
  const tester = seedUser();
  await request(app).post('/api/templates').set(...auth(tester)).send(newTemplate);
  const res = await request(app).post('/api/templates/1/duplicate').set(...auth(tester));
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.data.template_name, 'Smoke UI (Copy)');
});

test('DELETE /api/templates/:id returns 204, a second call returns 404', async () => {
  const tester = seedUser();
  await request(app).post('/api/templates').set(...auth(tester)).send(newTemplate);
  assert.strictEqual((await request(app).delete('/api/templates/1').set(...auth(tester))).status, 204);
  assert.strictEqual((await request(app).delete('/api/templates/1').set(...auth(tester))).status, 404);
});

// ---------- requireAuth (#8 gate 1) ----------

test('GET /api/templates without a token returns 401', async () => {
  const res = await request(app).get('/api/templates');
  assert.strictEqual(res.status, 401);
  assert.strictEqual(res.body.error.code, 'UNAUTHORIZED');
});

test('GET /api/templates with a garbage token returns 401', async () => {
  const res = await request(app).get('/api/templates').set('Authorization', 'Bearer not-a-jwt');
  assert.strictEqual(res.status, 401);
});

test('GET /api/templates with a token signed by another secret returns 401', async () => {
  const user = seedUser();
  const bad = jwt.sign({ user_id: user.user_id, role: user.user_role }, 'secret-khac');
  const res = await request(app).get('/api/templates').set('Authorization', `Bearer ${bad}`);
  assert.strictEqual(res.status, 401);
});

test('a valid token on a locked account returns 423', async () => {
  const locked = seedUser({ user_status: 'inactive' });
  const res = await request(app).get('/api/templates').set(...auth(locked));
  assert.strictEqual(res.status, 423);
  assert.strictEqual(res.body.error.code, 'ACCOUNT_LOCKED');
});

test('a token of a user deleted from the DB returns 401', async () => {
  const ghost = { user_id: 999, user_role: 'admin' };
  const res = await request(app).get('/api/templates').set(...auth(ghost));
  assert.strictEqual(res.status, 401);
});

// ---------- requireRole (#8 gate 2) ----------

test('a viewer can read the template list (200)', async () => {
  const res = await request(app).get('/api/templates').set(...auth(seedUser({ user_role: 'viewer' })));
  assert.strictEqual(res.status, 200);
});

test('a viewer creating a template gets 403', async () => {
  const res = await request(app).post('/api/templates')
    .set(...auth(seedUser({ user_role: 'viewer' }))).send(newTemplate);
  assert.strictEqual(res.status, 403);
  assert.strictEqual(res.body.error.code, 'FORBIDDEN');
});

test('a viewer deleting a template gets 403', async () => {
  const res = await request(app).delete('/api/templates/1')
    .set(...auth(seedUser({ user_role: 'viewer' })));
  assert.strictEqual(res.status, 403);
});

test('a dev editing a template gets 403 (SRS: dev does not manage templates)', async () => {
  const res = await request(app).put('/api/templates/1')
    .set(...auth(seedUser({ user_role: 'dev' }))).send({ description: 'x' });
  assert.strictEqual(res.status, 403);
});

test('an admin can create a template (201)', async () => {
  const res = await request(app).post('/api/templates')
    .set(...auth(seedUser({ user_role: 'admin' }))).send(newTemplate);
  assert.strictEqual(res.status, 201);
});

test('403 happens before touching the DB: a viewer calling a missing id still gets 403', async () => {
  const res = await request(app).delete('/api/templates/999')
    .set(...auth(seedUser({ user_role: 'viewer' })));
  assert.strictEqual(res.status, 403);
});

// ---------- Auth login ----------

test('POST /api/auth/login with the right password returns a token and never leaks password_hash', async () => {
  const user = seedUser({ email: 'a@b.co', user_role: 'viewer' });
  const res = await request(app).post('/api/auth/login').send({ email: 'a@b.co', password: PASSWORD });
  assert.strictEqual(res.status, 200);
  assert.strictEqual('password_hash' in res.body.data.user, false);
  const payload = jwt.verify(res.body.data.token, 'test-secret');
  assert.strictEqual(payload.user_id, user.user_id);
  assert.strictEqual(payload.role, 'viewer'); // taken from the user_role column
});

test('POST /api/auth/login with a wrong password returns 401', async () => {
  seedUser({ email: 'a@b.co' });
  const res = await request(app).post('/api/auth/login').send({ email: 'a@b.co', password: 'wrong' });
  assert.strictEqual(res.status, 401);
});

test('POST /api/auth/login with an unknown email also returns 401, not 500', async () => {
  const res = await request(app).post('/api/auth/login').send({ email: 'nobody@b.co', password: 'x' });
  assert.strictEqual(res.status, 401);
});

test('POST /api/auth/login on a locked account with the right password returns 423', async () => {
  seedUser({ email: 'locked@b.co', user_status: 'inactive' });
  const res = await request(app).post('/api/auth/login').send({ email: 'locked@b.co', password: PASSWORD });
  assert.strictEqual(res.status, 423);
});

test('POST /api/auth/login on a Google account (password_hash NULL) returns 401, does not throw', async () => {
  seedUser({ email: 'g@b.co', password_hash: null, auth_provider: 'GOOGLE' });
  const res = await request(app).post('/api/auth/login').send({ email: 'g@b.co', password: 'x' });
  assert.strictEqual(res.status, 401);
});

test('POST /api/auth/login with a malformed body returns 400', async () => {
  const res = await request(app).post('/api/auth/login').send({ email: 'not-an-email' });
  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');
});

// ---------- config/env (#7) ----------

// Must run in a child process: dotenv.config() reloads backend/.env from disk, so
// deleting process.env.JWT_SECRET in this process has no effect.
test('config/env throws and names the missing variable when JWT_SECRET is absent', () => {
  const { spawnSync } = require('node:child_process');
  const path = require('node:path');
  const envFile = path.resolve(__dirname, '../src/config/env.js');
  const dotenvFile = require.resolve('dotenv');

  const env = { ...process.env, DATABASE_URL: 'postgresql://u:p@h:5432/d' };
  delete env.JWT_SECRET;

  // env.js loads backend/.env by an absolute path, so cwd cannot hide it: stub dotenv in the
  // child's require cache instead, otherwise a developer who has a real .env sees this test fail.
  const script = `require.cache[${JSON.stringify(dotenvFile)}] = { id: 'dotenv', loaded: true, exports: { config: () => ({}) } };
                  require(${JSON.stringify(envFile)});`;
  const run = spawnSync(process.execPath, ['-e', script], { env, encoding: 'utf8' });

  assert.notStrictEqual(run.status, 0, 'it must exit with an error code');
  assert.match(run.stderr, /Missing required environment variables: JWT_SECRET/);
});

// ---------- locking in the move to PostgreSQL ----------

test('the template INSERT uses RETURNING and passes target_json as an object, not a string', async () => {
  const tester = seedUser();
  await request(app).post('/api/templates').set(...auth(tester)).send(newTemplate);

  const insert = lastSql.find((q) => q.sql.startsWith('INSERT'));
  assert.ok(insert, 'there must be an INSERT statement');
  assert.match(insert.sql, /RETURNING/, 'Postgres has no insertId, RETURNING is required');
  // target_json is a JSONB column: pg serializes the object itself; pre-stringifying stores the wrong type
  assert.deepStrictEqual(insert.params[3], { suiteId: 1 });
});

test('no SQL statement still uses the MySQL ? placeholder', async () => {
  const tester = seedUser();
  await request(app).post('/api/templates').set(...auth(tester)).send(newTemplate);
  await request(app).get('/api/templates?q=Smoke&scope=UI').set(...auth(tester));
  await request(app).put('/api/templates/1').set(...auth(tester)).send({ description: 'x' });
  await request(app).delete('/api/templates/1').set(...auth(tester));

  const mysqlish = lastSql.filter((q) => q.sql.includes('?'));
  assert.deepStrictEqual(mysqlish.map((q) => q.sql), [], 'a statement still uses ?');
  // and every parameterized statement must number them $n
  lastSql.filter((q) => q.params.length).forEach((q) => {
    assert.match(q.sql, /\$\d/, `missing $n: ${q.sql}`);
  });
});

// ---------- the route table matches the permission matrix in api-endpoints.md section 4 ----------

test('every write/edit/delete templates route has requireAuth + requireRole(admin,tester)', () => {
  const requireAuth = require('../src/middlewares/requireAuth');
  const routes = [];
  const walk = (stack, prefix) => {
    for (const layer of stack) {
      if (layer.route) {
        const handlers = layer.route.stack.map((s) => s.handle);
        routes.push({
          method: Object.keys(layer.route.methods)[0].toUpperCase(),
          path: prefix + layer.route.path,
          hasAuth: handlers.includes(requireAuth),
          roles: handlers.find((h) => h.roles)?.roles ?? null,
        });
      } else if (layer.name === 'router' && layer.handle?.stack) {
        const m = /^\^\\\/(.*?)\\\/\?/.exec(layer.regexp.source);
        walk(layer.handle.stack, prefix + (layer.path || (m ? `/${m[1].replace(/\\\//g, '/')}` : '')));
      }
    }
  };
  walk(app._router.stack, '');

  const templates = routes.filter((r) => r.path.startsWith('/api/templates'));
  assert.strictEqual(templates.length, 6, 'the templates group must have exactly 6 endpoints');

  // No template endpoint may be public
  templates.forEach((r) => assert.ok(r.hasAuth, `${r.method} ${r.path} is missing requireAuth`));

  // Write/edit/delete is admin + tester only; reading is any signed-in user
  templates.forEach((r) => {
    const isWrite = r.method !== 'GET';
    if (isWrite) {
      assert.deepStrictEqual(r.roles, ['admin', 'tester'], `${r.method} ${r.path} has the wrong roles`);
    } else {
      assert.strictEqual(r.roles, null, `${r.method} ${r.path} should not be role-restricted`);
    }
  });

  // login must be public, otherwise nobody can sign in
  const login = routes.find((r) => r.path === '/api/auth/login');
  assert.ok(login, 'POST /api/auth/login is missing');
  assert.strictEqual(login.hasAuth, false, 'login must not require a token');
});

// ---------------------------------------------------------------------------
// Register (issue #70). At the service layer with a fake repository: what matters is that a new
// account is ALWAYS viewer/active whatever the request says, that the password is hashed and that
// the hash never leaves the service.
const AuthService = require('../src/services/auth.service');

const registerService = (existingEmail = null) => {
  const created = [];
  const svc = new AuthService({
    userRepository: {
      findByEmail: async (email) => (email === existingEmail ? { user_id: 1, email } : null),
      create: async (row) => {
        created.push(row);
        return { user_id: 9, auth_provider: 'LOCAL', created_at: new Date(), ...row };
      },
    },
  });
  return { svc, created };
};

test('register: a new account is viewer + active, with a hashed password', async () => {
  const { svc, created } = registerService();
  const out = await svc.register({
    fullName: 'Nguyen Van A',
    email: 'van.a@eiu.edu.vn',
    password: PASSWORD,
    // Even if the caller sends these, they must not reach the repository.
    user_role: 'admin',
    user_status: 'inactive',
  });

  assert.equal(created.length, 1);
  assert.equal(created[0].user_role, 'viewer');
  assert.equal(created[0].user_status, 'active');
  assert.equal(created[0].full_name, 'Nguyen Van A');
  assert.notEqual(created[0].password_hash, PASSWORD); // hashed, not the plain password
  assert.ok(bcrypt.compareSync(PASSWORD, created[0].password_hash));

  assert.ok(out.token);
  assert.equal(jwt.verify(out.token, 'test-secret').role, 'viewer');
  assert.equal(out.user.user_role, 'viewer');
  assert.equal(out.user.password_hash, undefined); // the hash never leaves the service
});

test('register: an email that already exists → 409, nothing written', async () => {
  const { svc, created } = registerService('van.a@eiu.edu.vn');
  await assert.rejects(
    () => svc.register({ fullName: 'Khac Ten', email: 'van.a@eiu.edu.vn', password: PASSWORD }),
    { statusCode: 409, code: 'EMAIL_TAKEN' },
  );
  assert.equal(created.length, 0);
});

// The two tests below only check the ROUTE (wired up, validation, status code): the pg stub at the
// top of this file treats every INSERT as a template insert, so it cannot show what lands in `users`.
// What a new account looks like is covered by the two service tests above.
test('POST /auth/register: the route is wired up and returns 201', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ fullName: 'Nguyen Van A', email: 'Van.A@Eiu.Edu.Vn', password: PASSWORD });
  assert.equal(res.status, 201);
  assert.ok(res.body.data.token);
  // emailField lowercases before the DB, because uq_users_email is UNIQUE(lower(email)).
  assert.equal(lastSql.some((q) => q.params.includes('van.a@eiu.edu.vn')), true);
});

test('POST /auth/register: a short password is a 400 before anything is written', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ fullName: 'A', email: 'b@eiu.edu.vn', password: '123' });
  assert.equal(res.status, 400);
  // validate() runs before the controller, so the request must not have reached an INSERT at all.
  assert.equal(lastSql.some((q) => q.sql.startsWith('INSERT')), false);
});
