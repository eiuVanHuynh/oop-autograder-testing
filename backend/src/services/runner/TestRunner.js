// Adapter – giao diện chung cho nơi thực sự chạy test.
// Adapter – the shared interface for whatever actually runs the tests.
// runs.service chỉ biết giao diện này, nên đổi GitHub Actions sang thứ khác
// không phải sửa tầng nghiệp vụ.
//
// trigger({ runId, grep, env, timeout }) → trả ciRunId (hoặc null nếu nơi chạy không có id).
// cancel(ciRunId).
// Lớp con không cài đặt thì ném lỗi, đừng im lặng trả undefined.
class TestRunner {
  async trigger() {
    throw new Error('not implemented');
  }

  async cancel() {
    throw new Error('not implemented');
  }
}

module.exports = TestRunner;
