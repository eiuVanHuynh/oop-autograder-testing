// require('dotenv').config();

// const { defineConfig } = require('@playwright/test');

// module.exports = defineConfig({
//   testDir: './tests',

//   use: {
//     baseURL: process.env.BASE_URL,
//     browserName: process.env.PW_BROWSER || 'chromium',
//     headless: true,
//   },

//   reporter: [['list']],
// });
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',

  use: {
    // Hoặc bạn có thể gán trực tiếp URL vào đây để test nhanh:
    baseURL: process.env.BASE_URL || 'https://oop-autograder.vercel.app',
    browserName: process.env.PW_BROWSER || 'chromium',
    headless: false, // Bật false để bạn thấy trình duyệt hiện lên khi dùng --headed
  },

  reporter: [
    ['list'],
    ['./tests/utils/test-result-logger.js']
  ],
});