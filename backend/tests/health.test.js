// Phải đặt TRƯỚC require('../src/app'): config/env.js throw nếu thiếu biến bắt buộc,
// và test không nên phụ thuộc file .env của máy đang chạy.
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://u:p@localhost:5432/test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../src/app');

// Bài test mẫu, cũng là bài kiểm tra khung: app dựng được và router đã gắn.
// Sample test, which doubles as a frame check: the app builds and the router is mounted.
// Mỗi nhóm tính năng tự thêm file test của mình cạnh file này.
// Each feature group adds its own test file next to this one.
test('GET /api/health trả 200 khi DB ổn', async () => {
  const res = await request(app).get('/api/health');
  assert.strictEqual(res.status, 200);
});
