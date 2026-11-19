const TestRunner = require('./TestRunner');
const { ENVIRONMENTS } = require('../../validators/options');

// The real runner: triggers .github/workflows/run-tests.yml via workflow_dispatch.
//
// - Needs GITHUB_TOKEN (fine-grained, Actions: write) and GITHUB_REPO=owner/repo.
// - Inputs sent to the workflow: run_id, grep, env, timeout. A public repo's Actions log is readable by anyone →
//   visible → NEVER pass a secret through an input.
// - The workflow_dispatch API returns 204 with no run id → trigger() returns null.
//   Once an id exists (e.g. the workflow reports it to /ingest/runs) it is written to test_runs.ci_run_id, and only
//   then can cancel() really cancel. Without an id cancel() only records it, and the run is still marked 'interrupted'.
// - Actions take 20–60 seconds to start → do not treat 'no logs yet' as an error.
class GithubActionsRunner extends TestRunner {
  constructor({ token, repo, workflow = 'run-tests.yml', ref = 'main', baseUrls }) {
    super({ baseUrls });
    this.token = token;
    this.repo = repo;
    this.workflow = workflow;
    this.ref = ref;
  }

  // The real URL lives in GitHub Secrets and the backend cannot read it — so this only checks that the environment
  // NAME is in the list, it does NOT demand a second BASE_URL_* declaration on the backend. If the secret is missing,
  // the "Check the environment's BASE_URL" step in run-tests.yml fails and names the secret.
  checkEnv(env) {
    return ENVIRONMENTS.includes(env)
      ? null
      : `Environment "${env}" is not in the list: ${ENVIRONMENTS.join(', ')}`;
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
    // 409 = the run already ended, treat it as success.
    if (!res.ok && res.status !== 409) {
      throw new Error(`GitHub cancel ${res.status}`);
    }
  }
}

module.exports = GithubActionsRunner;
