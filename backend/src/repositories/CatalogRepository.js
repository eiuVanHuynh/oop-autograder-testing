const BaseRepository = require('./BaseRepository');

// Đọc test_suites / test_specs / test_cases – nơi khai báo test.
// Reads test_suites / test_specs / test_cases – where tests are declared.
//
// Cần làm / To do:
// - findReadyCaseCodes(suiteId): chỉ lấy test_status = 'ready', dùng để sinh --grep.
// - Ưu tiên automation_ref nếu test case có, không thì dùng tc_code.
// - Phần ghi (CRUD suite/spec/case) là 🟡, làm sau.
class CatalogRepository extends BaseRepository {
  constructor() {
    super('test_suites', 'suite_id');
  }

  // TODO
}

module.exports = CatalogRepository;
