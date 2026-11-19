require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  // Chỉ thu thập spec mới. tests/auth, tests/db, tests/submission là bản cũ đọc MySQL trực tiếp
  // — thu thập chúng là gọi mysql2 và làm sập cả lần chạy. Xóa hẳn chúng thì bỏ dòng này.
  testDir: './tests/srs',
  outputDir: './test-results',
  timeout: 90000,
  expect: { timeout: 15000 },
  use: {
    baseURL: process.env.BASE_URL,
    browserName: process.env.PW_BROWSER || 'chromium',
    headless: !!process.env.CI,
    screenshot: 'on',
    trace: 'on',
  },
  // test-result-logger.js (ghi thẳng MySQL) đã bỏ: backend là nơi duy nhất viết SQL.
  reporter: [['list'], ['./reporters/push-to-backend.js']],
});