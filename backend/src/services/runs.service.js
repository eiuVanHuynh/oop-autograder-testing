// Chạy test, theo dõi log, lịch sử, hủy, chạy lại.
// Running tests, log tailing, history, cancel, re-run.
// Quy tắc nghiệp vụ nằm ở đây. Không require pg, không chạm req/res.
// Business rules live here. Never require pg, never touch req/res.
// Nhận repository qua constructor để test thay được bằng bản giả.
// Takes its repositories through the constructor so tests can pass fakes.
//
// Cần làm / To do:
- Chọn test: nhờ services/target/ (Strategy) đổi template thành danh sách tc_code → biểu thức grep.
// - Gọi CI qua services/runner/ (Adapter), không require thẳng GitHub API ở đây.
// - Không ra test 'ready' nào → 409, KHÔNG gọi workflow (tránh báo passed giả).
// - Lưu grep vào test_runs.config_json; 'Chạy lại' gửi lại y nguyên config_json cũ.
// - Hủy: gọi runner.cancel(ci_run_id), ghi kết quả dở thành 'interrupted'.
class RunsService {
  constructor(deps = {}) {
    // TODO: nhận repository cần dùng từ config/container.js
  }

  // TODO
}

module.exports = RunsService;
