// pg is replaced by an in-memory stub, like tests/auth-templates.test.js does: /api/health asks the
// DB one SELECT 1, and this test is about the skeleton (the app builds, the router is mounted),
// not about a reachable database. Without the stub it was 503 on any machine with no local postgres.
const Module = require('module');
const origLoad = Module._load;
Module._load = function (req) {
  if (req === 'pg') {
    return {
      Pool: class {
        async query() { return { rows: [{ ok: 1 }], rowCount: 1 }; }
        async end() {}
      },
    };
  }
  return origLoad.apply(this, arguments);
};

// Must come BEFORE require('../src/app'): config/env.js throws when a required var is missing,
// and a test should not depend on the .env file of whatever machine runs it.
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://u:p@localhost:5432/test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../src/app');

// A sample test, and also a smoke test of the skeleton: the app builds and the router is mounted.
// Each feature group adds its own test file next to this one.
test('GET /api/health returns 200 when the DB is fine', async () => {
  const res = await request(app).get('/api/health');
  assert.strictEqual(res.status, 200);
});
