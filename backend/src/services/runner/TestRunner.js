// Adapter – the shared interface of wherever tests actually run.
// runs.service only knows this interface, so swapping GitHub Actions for something else
// needs no change in the business layer.
//
// trigger({ runId, testCodes, grep, env, timeout }) — env decides the runner's BASE_URL.
// trigger({ runId, testCodes, grep, env, timeout }) → returns ciRunId (or null if the runner has no id).
// testCodes: the test codes resolved from the template/suite. grep: that same list as a --grep
// expression for runners that only take a string (GitHub Actions). Never parse grep back into test codes.
// cancel(ciRunId).
// A subclass that does not implement it throws, rather than silently returning undefined.
class TestRunner {
  // baseUrls: { <environment>: url }. A runner tied to no URL (FakeRunner) leaves it empty.
  constructor({ baseUrls } = {}) {
    this.baseUrls = baseUrls || {};
  }

  baseUrlFor(env) {
    return this.baseUrls[env] || null;
  }

  // null = runnable with this environment; a string = the reason for the caller to return 400 BEFORE creating the run.
  // By default no URL is needed (FakeRunner); a subclass that hits a real site overrides this.
  checkEnv() {
    return null;
  }

  requireBaseUrl(env) {
    return this.baseUrlFor(env)
      ? null
      : `BASE_URL_${String(env).toUpperCase()} is not configured for environment "${env}"`;
  }

  async trigger() {
    throw new Error('not implemented');
  }

  async cancel() {
    throw new Error('not implemented');
  }
}

module.exports = TestRunner;
