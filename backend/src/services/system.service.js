// Kiểm tra sức khỏe hệ thống.
// System health check.
// Quy tắc nghiệp vụ nằm ở đây. Không require pg, không chạm req/res.
// Business rules live here. Never require pg, never touch req/res.
// Nhận repository qua constructor để test thay được bằng bản giả.
// Takes its repositories through the constructor so tests can pass fakes.
//
// Cần làm / To do:
- Chạy một câu SELECT 1 qua repository/db, đừng chỉ trả 200 cứng.
class SystemService {
  constructor(deps = {}) {
    // TODO: nhận repository cần dùng từ config/container.js
  }

  // TODO
}

module.exports = SystemService;
