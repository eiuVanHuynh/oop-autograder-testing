// Adapter – giao diện chung cho nơi thực sự chạy test.
// Adapter – the shared interface for whatever actually runs the tests.
// runs.service chỉ biết giao diện này, nên đổi GitHub Actions sang thứ khác
// không phải sửa tầng nghiệp vụ.
//
// trigger({ runId, testCodes, grep, env, timeout }) → trả ciRunId (hoặc null nếu nơi chạy không có id).
// testCodes: mã test đã giải ra từ template/suite. grep: cùng danh sách đó dưới dạng biểu thức
// --grep cho nơi chạy chỉ nhận chuỗi (GitHub Actions). Đừng parse grep ngược lại thành mã test.
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
