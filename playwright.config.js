require('dotenv').config();

const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',

  use: {
    baseURL: process.env.BASE_URL,
    browserName: process.env.PW_BROWSER || 'chromium',
    headless: true,
  },

  reporter: [['list']],
});