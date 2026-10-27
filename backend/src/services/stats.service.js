// Số liệu cho Dashboard.
// Numbers for the Dashboard.
// Quy tắc nghiệp vụ nằm ở đây. Không require pg, không chạm req/res.
// Business rules live here. Never require pg, never touch req/res.
// Nhận repository qua constructor để test thay được bằng bản giả.
// Takes its repositories through the constructor so tests can pass fakes.
//
// Cần làm / To do:
// - Tính tổng số run, tỷ lệ đạt, số đang chạy, lần lỗi gần nhất.
// - Trạng thái run phải tính ra, không đọc cột run_status (không có cột đó).
class StatsService {
  constructor(deps = {}) {
    // TODO: nhận repository cần dùng từ config/container.js
  }

  // TODO
}

module.exports = StatsService;
