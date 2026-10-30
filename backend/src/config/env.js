const path = require("path");

// Hai chỗ, chỗ nào có trước thì thắng (dotenv không ghi đè biến đã có):
//   backend/.env  — nơi .env.example chỉ tới, chạy server từ thư mục backend/
//   <gốc repo>/.env — dùng chung với automation/ và migrate.js
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
require("dotenv").config({ path: path.resolve(__dirname, "../../../.env") });

// Đọc biến môi trường một lần. Thiếu biến bắt buộc thì chết ngay lúc khởi động,
// Read env vars once. A missing required var kills the process at startup,
// còn hơn để chạy rồi lỗi 500 giữa chừng.
// which beats booting fine and throwing 500s later.
//
// Cần làm / To do:
// - Bổ sung biến khi dùng tới: GOOGLE_CLIENT_ID, GITHUB_TOKEN, INGEST_API_KEY…
// - Khi deploy Vercel nhớ khai báo đúng những tên này trong Project Settings.
const required = ["DATABASE_URL", "JWT_SECRET"];

const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  throw new Error(`Thiếu biến môi trường bắt buộc: ${missing.join(", ")}`);
}

module.exports = {
  PORT: process.env.PORT || 5000,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  INGEST_API_KEY: process.env.INGEST_API_KEY,
  NODE_ENV: process.env.NODE_ENV,
  
  // Bộ chạy test: 'github' | 'fake'. Bỏ trống → github nếu có GITHUB_TOKEN, ngược lại fake (chỉ ngoài production).
  RUNNER: process.env.RUNNER,
  GITHUB_TOKEN: process.env.GITHUB_TOKEN,
  GITHUB_REPO: process.env.GITHUB_REPO, // dạng owner/repo
  GITHUB_WORKFLOW: process.env.GITHUB_WORKFLOW || "run-tests.yml",
  GITHUB_REF: process.env.GITHUB_REF || "main",

  // RUNNER=playwright: chạy thật bằng Playwright ngay trong backend (chỉ local).
  // Tài khoản test không khai ở đây: test_data trỏ 'env:TEST_*' và services/runner/steps.js
  // đọc thẳng process.env, giống hệt khi spec chạy trong GitHub Actions.
  BASE_URL: process.env.BASE_URL, // web đích, vd https://web-nhom-kia
  PLAYWRIGHT_CHROMIUM_PATH: process.env.PLAYWRIGHT_CHROMIUM_PATH,
};
