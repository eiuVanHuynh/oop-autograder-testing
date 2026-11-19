const env = require('../../config/env');
const FakeRunner = require('./FakeRunner');
const GithubActionsRunner = require('./GithubActionsRunner');
const PlaywrightRunner = require('./PlaywrightRunner');

// Pick the test runner from the RUNNER environment variable ('github' | 'fake').
// Empty: GITHUB_TOKEN present → github, absent → fake (outside production only).
// In production with an incomplete config, trigger() reports a clear error and does NOT silently fake a run.
const notConfigured = (reason) => ({
  trigger: async () => {
    throw new Error(`No test runner configured: ${reason}`);
  },
  cancel: async () => {},
  checkEnv: () => null, // a config error belongs to trigger(), it must not masquerade as a user 400
});

function createRunner({ logRepository, runRepository, resultRepository, catalogRepository }) {
  const kind = (env.RUNNER || (env.GITHUB_TOKEN ? 'github' : 'fake')).toLowerCase();

  if (kind === 'github') {
    if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
      return notConfigured('missing GITHUB_TOKEN or GITHUB_REPO (owner/repo)');
    }
    return new GithubActionsRunner({
      token: env.GITHUB_TOKEN,
      repo: env.GITHUB_REPO,
      workflow: env.GITHUB_WORKFLOW,
      ref: env.GITHUB_REF,
      baseUrls: env.BASE_URLS,
    });
  }

  // playwright = a real run inside the backend process, local use only (see PlaywrightRunner).
  if (kind === 'playwright') {
    if (!Object.keys(env.BASE_URLS).length) {
      return notConfigured('missing BASE_URL_<ENVIRONMENT> (the target site for Playwright)');
    }
    return new PlaywrightRunner({
      logRepository,
      runRepository,
      resultRepository,
      catalogRepository,
      baseUrls: env.BASE_URLS,
      executablePath: env.PLAYWRIGHT_CHROMIUM_PATH,
    });
  }

  if (kind === 'fake') {
    if (env.NODE_ENV === 'production') {
      return notConfigured('set RUNNER=github together with GITHUB_TOKEN and GITHUB_REPO');
    }
    console.warn('[runner] FakeRunner: runs are simulated, no real test executes.');
    return new FakeRunner({ logRepository, runRepository });
  }

  return notConfigured(`RUNNER="${env.RUNNER}" is invalid (github | fake | playwright)`);
}

module.exports = { createRunner };
