const path = require("path");

// Two places, whichever comes first wins (dotenv does not override existing vars):
//   backend/.env  — where .env.example points, when the server runs from backend/
//   <repo root>/.env — shared with automation/ and migrate.js
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
require("dotenv").config({ path: path.resolve(__dirname, "../../../.env") });

// Read env vars once. A missing required var kills the process at startup,
// which beats running and then failing with a 500 halfway through.
// which beats booting fine and throwing 500s later.
//
// To do:
// - Add vars as they get used: GOOGLE_CLIENT_ID, GITHUB_TOKEN, INGEST_API_KEY…
// - When deploying to Vercel, declare these exact names in Project Settings.
const required = ["DATABASE_URL", "JWT_SECRET"];

// BASE_URL_<ENVIRONMENT> → the target site of that environment, e.g. BASE_URL_STAGING.
// Picking an environment on Run must CHANGE where tests run, not just the label in test_runs;
// if an environment's var is missing, POST /runs with that env returns 400 (services/runner/TestRunner.js).
// BASE_URL (old name, no suffix) is still accepted as development so old local setups keep working.
const baseUrls = Object.fromEntries(
  Object.entries(process.env)
    .filter(([key, value]) => key.startsWith("BASE_URL_") && value)
    .map(([key, value]) => [key.slice("BASE_URL_".length).toLowerCase(), value]),
);
if (process.env.BASE_URL && !baseUrls.development) {
  baseUrls.development = process.env.BASE_URL;
}

const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
}

module.exports = {
  PORT: process.env.PORT || 5000,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  INGEST_API_KEY: process.env.INGEST_API_KEY,

  // URL gốc công khai của chính API này, dùng để dựng link ảnh bằng chứng (/api/evidences/:token).
  // Bỏ trống thì lấy theo host của request — đúng cho local, nhưng sau proxy nên khai báo hẳn.
  PUBLIC_API_URL: process.env.PUBLIC_API_URL,
  NODE_ENV: process.env.NODE_ENV,
  
  // Test runner: 'github' | 'fake'. Empty → github if GITHUB_TOKEN is set, otherwise fake (outside production only).
  RUNNER: process.env.RUNNER,
  GITHUB_TOKEN: process.env.GITHUB_TOKEN,
  GITHUB_REPO: process.env.GITHUB_REPO, // owner/repo format
  GITHUB_WORKFLOW: process.env.GITHUB_WORKFLOW || "run-tests.yml",
  GITHUB_REF: process.env.GITHUB_REF || "main",

  // RUNNER=playwright: really run Playwright inside the backend (local only).
  // Test accounts are not declared here: test_data points at 'env:TEST_*' and services/runner/steps.js
  // reads process.env directly, exactly like when the spec runs in GitHub Actions.
  // BASE_URL (old name) is no longer exported separately: it is folded into BASE_URLS.development above.
  BASE_URLS: baseUrls, // { development: 'https://…', staging: '…' }
  PLAYWRIGHT_CHROMIUM_PATH: process.env.PLAYWRIGHT_CHROMIUM_PATH,
};
