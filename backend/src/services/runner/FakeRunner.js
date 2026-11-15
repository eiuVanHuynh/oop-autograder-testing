const TestRunner = require('./TestRunner');

// The fake used by tests and local runs: it never calls GitHub.
//
// - Always records the arguments of each call (this.calls) so tests can check the grep expression.
// - Given logRepository + runRepository it simulates a run: writes a few log lines
//   tagged [FAKE RUNNER] then closes the run as 'passed'. These are NOT real test results.
class FakeRunner extends TestRunner {
  constructor({ logRepository, runRepository, stepMs = 700, baseUrls } = {}) {
    super({ baseUrls });
    this.logRepository = logRepository;
    this.runRepository = runRepository;
    this.stepMs = stepMs;
    this.calls = [];
    this.cancelled = new Set();
  }

  async trigger({ runId, grep, env, timeout }) {
    this.calls.push({ runId, grep, env, timeout });
    const ciRunId = `fake-${runId}`;
    if (this.logRepository && this.runRepository) this._simulate(runId, ciRunId, { grep, env });
    return ciRunId;
  }

  async cancel(ciRunId) {
    if (ciRunId) this.cancelled.add(String(ciRunId));
  }

  _simulate(runId, ciRunId, { grep, env }) {
    const lines = [
      ['info', '[FAKE RUNNER] Simulating a test run; no real test was executed.'],
      ['info', `[FAKE RUNNER] env=${env} grep=${grep}`],
      ['info', '[FAKE RUNNER] Done.'],
    ];
    let i = 0;
    const step = async () => {
      if (this.cancelled.has(ciRunId)) return;
      try {
        if (i < lines.length) {
          await this.logRepository.append(runId, lines[i][0], lines[i][1]);
          i += 1;
          setTimeout(step, this.stepMs).unref();
        } else {
          await this.runRepository.markFinished(runId, 'passed');
        }
      } catch (err) {
        console.error('[FakeRunner]', err.message);
      }
    };
    setTimeout(step, this.stepMs).unref();
  }
}

module.exports = FakeRunner;
