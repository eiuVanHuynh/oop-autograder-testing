// Cửa sau cho máy: Playwright đẩy kết quả và log về.
// Machine-only door: Playwright pushes results and logs back.
// Quy tắc nghiệp vụ nằm ở đây. Không require pg, không chạm req/res.
// Business rules live here. Never require pg, never touch req/res.
// Nhận repository qua constructor để test thay được bằng bản giả.
// Takes its repositories through the constructor so tests can pass fakes.
//
// Cần làm / To do:
// - finish gọi lần thứ hai cho cùng một run → 409.
// - Nhận log theo seq để polling ?after= không bị trùng/thiếu dòng.
// - Chạy xong thì xóa log tạm của run đó.
class IngestService {
  constructor(deps = {}) {
    // TODO: nhận repository cần dùng từ config/container.js
  }

  // TODO
}

module.exports = IngestService;
