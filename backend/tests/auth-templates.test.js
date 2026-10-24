// Kiểm tra Auth + Templates qua HTTP mà không cần PostgreSQL: thay pg bằng bảng trong RAM.
// Phải chạy TRƯỚC require('../src/app') vì app nối dây db ngay lúc require.
// Stub nhận placeholder $n chứ không phải ?, nên câu SQL nào còn sót cú pháp MySQL sẽ lộ ra.
const Module = require('module');
const origLoad = Module._load;
let templates = [];
let users = [];
let nextId = 1;
let lastSql = [];   // để assert RETURNING và kiểu tham số

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
              target_json: p[3], env: p[4], timeout: p[5], created_by: p[6],
            });
            return { rows: [{ template_id: nextId++ }], rowCount: 1 };
          }
          if (s.startsWith('DELETE')) {
            const before = templates.length;
            templates = templates.filter((t) => t.template_id !== Number(p[0]));
            return { rows: [], rowCount: before - templates.length };
          }
          if (s.startsWith('UPDATE')) return { rows: [], rowCount: 1 };
          // requireAuth tra cứu theo user_id, login tra cứu theo email
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
const HASH = bcrypt.hashSync(PASSWORD, 4); // cost thấp cho nhanh, chỉ dùng trong test

// Tên cột theo schema thật: user_role / user_status (không phải role / status).
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

// ---------- Templates: nghiệp vụ ----------

test('POST /api/templates tạo được template và trả 201', async () => {
  const tester = seedUser({ user_role: 'tester' });
  const res = await request(app).post('/api/templates').set(...auth(tester)).send(newTemplate);
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.data.template_name, 'Smoke UI');
  // target_json phải về dạng object, không phải chuỗi JSON
  assert.deepStrictEqual(res.body.data.target_json, { suiteId: 1 });
  // created_by lấy từ token, không phải giá trị mặc định
  assert.strictEqual(res.body.data.created_by, tester.user_id);
});

test('POST /api/templates trùng tên trả 409', async () => {
  const tester = seedUser();
  await request(app).post('/api/templates').set(...auth(tester)).send(newTemplate);
  const res = await request(app).post('/api/templates').set(...auth(tester)).send(newTemplate);
  assert.strictEqual(res.status, 409);
});

test('POST /api/templates thiếu target_json trả 400 kèm details', async () => {
  const tester = seedUser();
  const res = await request(app).post('/api/templates').set(...auth(tester))
    .send({ template_name: 'No target', target_json: { testIds: [] } });
  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');
  assert.ok(Array.isArray(res.body.error.details));
});

test('GET /api/templates/:id không tồn tại trả 404 chứ không treo', async () => {
  const res = await request(app).get('/api/templates/999').set(...auth(seedUser()));
  assert.strictEqual(res.status, 404);
  assert.strictEqual(res.body.error.message, 'Template not found');
});

test('POST /api/templates/:id/duplicate đặt tên (Copy) và trả 201', async () => {
  const tester = seedUser();
  await request(app).post('/api/templates').set(...auth(tester)).send(newTemplate);
  const res = await request(app).post('/api/templates/1/duplicate').set(...auth(tester));
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.data.template_name, 'Smoke UI (Copy)');
});

test('DELETE /api/templates/:id trả 204, gọi lần hai trả 404', async () => {
  const tester = seedUser();
  await request(app).post('/api/templates').set(...auth(tester)).send(newTemplate);
  assert.strictEqual((await request(app).delete('/api/templates/1').set(...auth(tester))).status, 204);
  assert.strictEqual((await request(app).delete('/api/templates/1').set(...auth(tester))).status, 404);
});

// ---------- requireAuth (#8 cửa 1) ----------

test('GET /api/templates không kèm token trả 401', async () => {
  const res = await request(app).get('/api/templates');
  assert.strictEqual(res.status, 401);
  assert.strictEqual(res.body.error.code, 'UNAUTHORIZED');
});

test('GET /api/templates với token rác trả 401', async () => {
  const res = await request(app).get('/api/templates').set('Authorization', 'Bearer khong-phai-jwt');
  assert.strictEqual(res.status, 401);
});

test('GET /api/templates với token ký bằng secret khác trả 401', async () => {
  const user = seedUser();
  const bad = jwt.sign({ user_id: user.user_id, role: user.user_role }, 'secret-khac');
  const res = await request(app).get('/api/templates').set('Authorization', `Bearer ${bad}`);
  assert.strictEqual(res.status, 401);
});

test('token hợp lệ nhưng tài khoản đã bị khóa trả 423', async () => {
  const locked = seedUser({ user_status: 'inactive' });
  const res = await request(app).get('/api/templates').set(...auth(locked));
  assert.strictEqual(res.status, 423);
  assert.strictEqual(res.body.error.code, 'ACCOUNT_LOCKED');
});

test('token của user đã bị xóa khỏi DB trả 401', async () => {
  const ghost = { user_id: 999, user_role: 'admin' };
  const res = await request(app).get('/api/templates').set(...auth(ghost));
  assert.strictEqual(res.status, 401);
});

// ---------- requireRole (#8 cửa 2) ----------

test('viewer đọc được danh sách template (200)', async () => {
  const res = await request(app).get('/api/templates').set(...auth(seedUser({ user_role: 'viewer' })));
  assert.strictEqual(res.status, 200);
});

test('viewer tạo template trả 403', async () => {
  const res = await request(app).post('/api/templates')
    .set(...auth(seedUser({ user_role: 'viewer' }))).send(newTemplate);
  assert.strictEqual(res.status, 403);
  assert.strictEqual(res.body.error.code, 'FORBIDDEN');
});

test('viewer xóa template trả 403', async () => {
  const res = await request(app).delete('/api/templates/1')
    .set(...auth(seedUser({ user_role: 'viewer' })));
  assert.strictEqual(res.status, 403);
});

test('dev sửa template trả 403 (SRS: dev không quản lý template)', async () => {
  const res = await request(app).put('/api/templates/1')
    .set(...auth(seedUser({ user_role: 'dev' }))).send({ description: 'x' });
  assert.strictEqual(res.status, 403);
});

test('admin tạo template được (201)', async () => {
  const res = await request(app).post('/api/templates')
    .set(...auth(seedUser({ user_role: 'admin' }))).send(newTemplate);
  assert.strictEqual(res.status, 201);
});

test('403 xảy ra trước khi chạm DB: viewer gọi vào id không tồn tại vẫn là 403', async () => {
  const res = await request(app).delete('/api/templates/999')
    .set(...auth(seedUser({ user_role: 'viewer' })));
  assert.strictEqual(res.status, 403);
});

// ---------- Auth login ----------

test('POST /api/auth/login đúng mật khẩu trả token và không lộ password_hash', async () => {
  const user = seedUser({ email: 'a@b.co', user_role: 'viewer' });
  const res = await request(app).post('/api/auth/login').send({ email: 'a@b.co', password: PASSWORD });
  assert.strictEqual(res.status, 200);
  assert.strictEqual('password_hash' in res.body.data.user, false);
  const payload = jwt.verify(res.body.data.token, 'test-secret');
  assert.strictEqual(payload.user_id, user.user_id);
  assert.strictEqual(payload.role, 'viewer'); // lấy từ cột user_role
});

test('POST /api/auth/login sai mật khẩu trả 401', async () => {
  seedUser({ email: 'a@b.co' });
  const res = await request(app).post('/api/auth/login').send({ email: 'a@b.co', password: 'wrong' });
  assert.strictEqual(res.status, 401);
});

test('POST /api/auth/login email không tồn tại cũng trả 401, không 500', async () => {
  const res = await request(app).post('/api/auth/login').send({ email: 'nobody@b.co', password: 'x' });
  assert.strictEqual(res.status, 401);
});

test('POST /api/auth/login tài khoản bị khóa, mật khẩu đúng, trả 423', async () => {
  seedUser({ email: 'locked@b.co', user_status: 'inactive' });
  const res = await request(app).post('/api/auth/login').send({ email: 'locked@b.co', password: PASSWORD });
  assert.strictEqual(res.status, 423);
});

test('POST /api/auth/login tài khoản Google (password_hash NULL) trả 401, không throw', async () => {
  seedUser({ email: 'g@b.co', password_hash: null, auth_provider: 'GOOGLE' });
  const res = await request(app).post('/api/auth/login').send({ email: 'g@b.co', password: 'x' });
  assert.strictEqual(res.status, 401);
});

test('POST /api/auth/login body sai định dạng trả 400', async () => {
  const res = await request(app).post('/api/auth/login').send({ email: 'khong-phai-email' });
  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');
});

// ---------- config/env (#7) ----------

// Phải chạy trong tiến trình con: dotenv.config() nạp lại backend/.env từ đĩa, nên
// xóa process.env.JWT_SECRET trong tiến trình này không có tác dụng.
test('config/env throw và nêu tên biến thiếu khi thiếu JWT_SECRET', () => {
  const { spawnSync } = require('node:child_process');
  const path = require('node:path');
  const envFile = path.resolve(__dirname, '../src/config/env.js');

  const env = { ...process.env, DATABASE_URL: 'postgresql://u:p@h:5432/d' };
  delete env.JWT_SECRET;

  const run = spawnSync(process.execPath, ['-e', `require(${JSON.stringify(envFile)})`], {
    cwd: require('node:os').tmpdir(), // thư mục không có .env để dotenv nạp
    env,
    encoding: 'utf8',
  });

  assert.notStrictEqual(run.status, 0, 'phải thoát với mã lỗi');
  assert.match(run.stderr, /Thiếu biến môi trường bắt buộc: JWT_SECRET/);
});

// ---------- chốt việc dịch sang PostgreSQL ----------

test('INSERT template dùng RETURNING và truyền target_json là object, không phải chuỗi', async () => {
  const tester = seedUser();
  await request(app).post('/api/templates').set(...auth(tester)).send(newTemplate);

  const insert = lastSql.find((q) => q.sql.startsWith('INSERT'));
  assert.ok(insert, 'phải có câu INSERT');
  assert.match(insert.sql, /RETURNING/, 'Postgres không có insertId, phải dùng RETURNING');
  // target_json là cột JSONB: pg tự tuần tự hóa object; stringify sẵn sẽ lưu sai kiểu
  assert.deepStrictEqual(insert.params[3], { suiteId: 1 });
});

test('không câu SQL nào còn placeholder ? của MySQL', async () => {
  const tester = seedUser();
  await request(app).post('/api/templates').set(...auth(tester)).send(newTemplate);
  await request(app).get('/api/templates?q=Smoke&scope=UI').set(...auth(tester));
  await request(app).put('/api/templates/1').set(...auth(tester)).send({ description: 'x' });
  await request(app).delete('/api/templates/1').set(...auth(tester));

  const mysqlish = lastSql.filter((q) => q.sql.includes('?'));
  assert.deepStrictEqual(mysqlish.map((q) => q.sql), [], 'còn câu dùng ?');
  // và mọi câu có tham số đều phải đánh số $n
  lastSql.filter((q) => q.params.length).forEach((q) => {
    assert.match(q.sql, /\$\d/, `thiếu $n: ${q.sql}`);
  });
});

// ---------- bảng route khớp ma trận quyền trong api-endpoints.md mục 4 ----------

test('mọi route templates ghi/sửa/xóa đều gắn requireAuth + requireRole(admin,tester)', () => {
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
  assert.strictEqual(templates.length, 6, 'nhóm templates phải có đúng 6 endpoint');

  // Không endpoint template nào được công khai
  templates.forEach((r) => assert.ok(r.hasAuth, `${r.method} ${r.path} thiếu requireAuth`));

  // Ghi/sửa/xóa chỉ admin + tester; đọc thì mọi user đã đăng nhập
  templates.forEach((r) => {
    const isWrite = r.method !== 'GET';
    if (isWrite) {
      assert.deepStrictEqual(r.roles, ['admin', 'tester'], `${r.method} ${r.path} sai vai trò`);
    } else {
      assert.strictEqual(r.roles, null, `${r.method} ${r.path} không nên chặn theo vai trò`);
    }
  });

  // login phải công khai, nếu không thì không ai đăng nhập được
  const login = routes.find((r) => r.path === '/api/auth/login');
  assert.ok(login, 'thiếu POST /api/auth/login');
  assert.strictEqual(login.hasAuth, false, 'login không được đòi token');
});
