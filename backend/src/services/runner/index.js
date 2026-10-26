const env = require('../../config/env');
const FakeRunner = require('./FakeRunner');
const GithubActionsRunner = require('./GithubActionsRunner');

// Chọn bộ chạy test theo biến môi trường RUNNER ('github' | 'fake').
// Bỏ trống: có GITHUB_TOKEN → github, không có → fake (chỉ ngoài production).
// Ở production mà chưa cấu hình đủ thì trigger() báo lỗi rõ ràng, KHÔNG chạy giả im lặng.
const notConfigured = (reason) => ({
  trigger: async () => {
    throw new Error(`Chưa cấu hình bộ chạy test: ${reason}`);
  },
  cancel: async () => {},
});

function createRunner({ logRepository, runRepository }) {
  const kind = (env.RUNNER || (env.GITHUB_TOKEN ? 'github' : 'fake')).toLowerCase();

  if (kind === 'github') {
    if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
      return notConfigured('thiếu GITHUB_TOKEN hoặc GITHUB_REPO (owner/repo)');
    }
    return new GithubActionsRunner({
      token: env.GITHUB_TOKEN,
      repo: env.GITHUB_REPO,
      workflow: env.GITHUB_WORKFLOW,
      ref: env.GITHUB_REF,
    });
  }

  if (kind === 'fake') {
    if (env.NODE_ENV === 'production') {
      return notConfigured('đặt RUNNER=github cùng GITHUB_TOKEN và GITHUB_REPO');
    }
    console.warn('[runner] Đang dùng FakeRunner: run chỉ được giả lập, không chạy test thật.');
    return new FakeRunner({ logRepository, runRepository });
  }

  return notConfigured(`RUNNER="${env.RUNNER}" không hợp lệ (github | fake)`);
}

module.exports = { createRunner };
