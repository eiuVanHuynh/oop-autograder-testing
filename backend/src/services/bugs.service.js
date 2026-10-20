// Báo lỗi từ một kết quả test bị Fail (🟡).
// Bug reports raised from a failed test result (🟡).
// Quy tắc nghiệp vụ nằm ở đây. Không require pg, không chạm req/res.
// Business rules live here. Never require pg, never touch req/res.
// Nhận repository qua constructor để test thay được bằng bản giả.
// Takes its repositories through the constructor so tests can pass fakes.
//
// Cần làm / To do:
- Chỉ báo lỗi được khi kết quả đó là Fail; test đã đạt → 409.
class BugsService {
  constructor(deps = {}) {
    // TODO: nhận repository cần dùng từ config/container.js
  }

  // TODO
}

module.exports = BugsService;
