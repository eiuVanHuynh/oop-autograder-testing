const TestRunner = require('./TestRunner');

// Bản giả cho test và cho lúc chạy local: không gọi GitHub, chỉ ghi nhận lời gọi.
// Fake used by tests and local runs: never calls GitHub, just records the call.
//
// Cần làm / To do:
// - start: trả ciRunId giả, lưu lại tham số để bài test kiểm tra biểu thức grep.
class FakeRunner extends TestRunner {
  // TODO
}

module.exports = FakeRunner;
