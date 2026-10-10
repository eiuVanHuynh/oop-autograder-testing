require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  timeout: 90000,
  expect: { timeout: 15000 },
  use: {
    baseURL: process.env.BASE_URL,
    browserName: process.env.PW_BROWSER || 'chromium',
    headless: !!process.env.CI,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  reporter: [['list'], ['./reporters/test-result-logger.js']],
});