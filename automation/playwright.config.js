require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  use: {
    baseURL: process.env.BASE_URL,
    browserName: process.env.PW_BROWSER || 'chromium',
    headless: !!process.env.CI,   // local: hiện trình duyệt, CI: ẩn
  },
  reporter: [['list'], ['./reporters/test-result-logger.js']],
});