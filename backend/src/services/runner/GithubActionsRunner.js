const TestRunner = require('./TestRunner');
const { ENVIRONMENTS } = require('../../validators/options');

// Bản chạy thật: kích hoạt .github/workflows/run-tests.yml bằng workflow_dispatch.
// The real implementation: triggers .github/workflows/run-tests.yml via workflow_dispatch.
//
// - Cần GITHUB_TOKEN (fine-grained, quyền Actions: write) và GITHUB_REPO=owner/repo.
// - Input gửi sang workflow: run_id, grep, env, timeout. Log Actions của repo public ai cũng
//   xem được → KHÔNG truyền bí mật qua input.
// - API workflow_dispatch trả 204, không kèm id của lần chạy → trigger() trả null.
//   Khi có id (vd workflow tự báo về /ingest/runs) thì ghi vào test_runs.ci_run_id, lúc đó
//   cancel() mới hủy được. Chưa có id thì cancel() chỉ ghi nhận, run vẫn được đánh dấu 'interrupted'.
// - Actions mất 20–60 giây mới khởi động → đừng coi 'chưa có log' là lỗi.
class GithubActionsRunner extends TestRunner {
  constructor({ token, repo, workflow = 'run-tests.yml', ref = 'main', baseUrls }) {
    super({ baseUrls });
    this.token = token;
    this.repo = repo;
    this.workflow = workflow;
    this.ref = ref;
  }

  // URL thật nằm ở GitHub Secrets, backend không đọc được — nên ở đây chỉ kiểm TÊN môi trường
  // có trong danh sách, KHÔNG đòi khai BASE_URL_* lần thứ hai phía backend. Secret thiếu thì
  // step "Kiểm BASE_URL của môi trường" trong run-tests.yml fail và nói rõ tên secret.
  checkEnv(env) {
    return ENVIRONMENTS.includes(env)
      ? null
      : `Môi trường "${env}" không có trong danh sách: ${ENVIRONMENTS.join(', ')}`;
  }

  get headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    };
  }

  async trigger({ runId, grep, env, timeout }) {
    const url = `https://api.github.com/repos/${this.repo}/actions/workflows/${this.workflow}/dispatches`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        ref: this.ref,
        inputs: {
          run_id: String(runId),
          grep: String(grep),
          env: String(env),
          timeout: String(timeout),
        },
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`GitHub ${res.status}: ${text.slice(0, 200)}`);
    }
    return null;
  }

  async cancel(ciRunId) {
    if (!ciRunId) return;
    const res = await fetch(
      `https://api.github.com/repos/${this.repo}/actions/runs/${ciRunId}/cancel`,
      { method: 'POST', headers: this.headers },
    );
    // 409 = run đã kết thúc, coi như thành công.
    if (!res.ok && res.status !== 409) {
      throw new Error(`GitHub cancel ${res.status}`);
    }
  }
}

module.exports = GithubActionsRunner;
