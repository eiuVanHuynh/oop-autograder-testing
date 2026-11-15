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
