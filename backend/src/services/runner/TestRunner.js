// Adapter – giao diện chung cho nơi thực sự chạy test.
// Adapter – the shared interface for whatever actually runs the tests.
// runs.service chỉ biết giao diện này, nên đổi GitHub Actions sang thứ khác
// runs.service only knows this interface, so swapping GitHub Actions for something else
// không phải sửa tầng nghiệp vụ.
// does not touch the business layer.
//
// Cần làm / To do:
// - start({ runId, grep, env, timeout }) → trả ciRunId.
// - cancel(ciRunId).
// - Lớp con không cài đặt thì ném lỗi, đừng im lặng trả undefined.
class TestRunner {
  async start() {
    throw new Error('not implemented');
  }

  async cancel() {
    throw new Error('not implemented');
  }
}

module.exports = TestRunner;
