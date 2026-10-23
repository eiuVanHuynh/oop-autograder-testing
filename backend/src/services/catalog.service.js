// Suite / spec / case – nơi khai báo test, nguồn để chọn target.
// Suites / specs / cases – where tests are declared, the source for picking targets.
// Quy tắc nghiệp vụ nằm ở đây. Không require pg, không chạm req/res.
// Business rules live here. Never require pg, never touch req/res.
// Nhận repository qua constructor để test thay được bằng bản giả.
// Takes its repositories through the constructor so tests can pass fakes.
//
// Cần làm / To do:
// - Chỉ test_status = 'ready' mới được chạy; draft và deprecated bị bỏ qua.
// - Cũng là nguồn cho helper loadTestCase(tcCode) bên automation/.
class CatalogService {
  constructor(deps = {}) {
    // TODO: nhận repository cần dùng từ config/container.js
  }

  // TODO
}

module.exports = CatalogService;
