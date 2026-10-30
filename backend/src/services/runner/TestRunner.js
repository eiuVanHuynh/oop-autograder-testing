// Adapter – giao diện chung cho nơi thực sự chạy test.
// Adapter – the shared interface for whatever actually runs the tests.
// runs.service chỉ biết giao diện này, nên đổi GitHub Actions sang thứ khác
// không phải sửa tầng nghiệp vụ.
//
// trigger({ runId, testCodes, grep, env, timeout }) — env quyết định BASE_URL của nơi chạy.
// trigger({ runId, testCodes, grep, env, timeout }) → trả ciRunId (hoặc null nếu nơi chạy không có id).
// testCodes: mã test đã giải ra từ template/suite. grep: cùng danh sách đó dưới dạng biểu thức
// --grep cho nơi chạy chỉ nhận chuỗi (GitHub Actions). Đừng parse grep ngược lại thành mã test.
// cancel(ciRunId).
// Lớp con không cài đặt thì ném lỗi, đừng im lặng trả undefined.
class TestRunner {
  // baseUrls: { <môi trường>: url }. Nơi chạy không gắn với URL nào (FakeRunner) thì bỏ trống.
  constructor({ baseUrls } = {}) {
    this.baseUrls = baseUrls || {};
  }

  baseUrlFor(env) {
    return this.baseUrls[env] || null;
  }

  // null = chạy được với môi trường này; chuỗi = lý do để nơi gọi trả 400 TRƯỚC khi tạo run.
  // Mặc định không cần URL nào (FakeRunner); lớp con nào bắn vào web thật thì ghi đè.
  checkEnv() {
    return null;
  }

  requireBaseUrl(env) {
    return this.baseUrlFor(env)
      ? null
      : `Chưa cấu hình BASE_URL_${String(env).toUpperCase()} cho môi trường "${env}"`;
  }

  async trigger() {
    throw new Error('not implemented');
  }

  async cancel() {
    throw new Error('not implemented');
  }
}

module.exports = TestRunner;
