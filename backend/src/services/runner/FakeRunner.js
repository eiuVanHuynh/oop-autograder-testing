const TestRunner = require('./TestRunner');

// Bản giả cho test và cho lúc chạy local: không gọi GitHub.
// Fake used by tests and local runs: never calls GitHub.
//
// - Luôn lưu lại tham số mỗi lần gọi (this.calls) để bài test kiểm tra biểu thức grep.
// - Nếu truyền logRepository + runRepository thì mô phỏng một lần chạy: ghi vài dòng log
//   gắn nhãn [FAKE RUNNER] rồi đóng run là 'passed'. KHÔNG phải kết quả test thật.
class FakeRunner extends TestRunner {
  constructor({ logRepository, runRepository, stepMs = 700 } = {}) {
    super();
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
      ['info', '[FAKE RUNNER] Giả lập chạy test, không có test thật nào được thực thi.'],
      ['info', `[FAKE RUNNER] env=${env} grep=${grep}`],
      ['info', '[FAKE RUNNER] Hoàn tất.'],
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
