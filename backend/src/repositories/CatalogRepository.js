const BaseRepository = require('./BaseRepository');

// Đọc test_suites / test_specs / test_cases – nơi khai báo test.
// Reads test_suites / test_specs / test_cases – where tests are declared.
//
// Chỉ lấy test_status = 'ready'. Ưu tiên automation_ref nếu có, không thì dùng tc_code.
// Giả định cột (db/schema): test_cases(spec_id, tc_code, automation_ref, test_status),
// test_specs(spec_id, suite_id). Nếu schema thật đặt tên khác, sửa 2 câu SQL dưới đây.
// Phần ghi (CRUD suite/spec/case) là 🟡, làm sau.
const CODE_EXPR = "COALESCE(NULLIF(c.automation_ref, ''), c.tc_code)";

class CatalogRepository extends BaseRepository {
  constructor() {
    super('test_suites', 'suite_id');
  }

  // Mã test 'ready' của một suite, dùng để sinh --grep.
  async findReadyCaseCodes(suiteId) {
    const res = await this.query(
      `SELECT ${CODE_EXPR} AS code
         FROM test_cases c
         JOIN test_specs s ON s.spec_id = c.spec_id
        WHERE s.suite_id = $1 AND c.test_status = 'ready'
        ORDER BY c.tc_code`,
      [suiteId],
    );
    return res.rows.map((r) => r.code);
  }

  // Trong danh sách tc_code người dùng gửi lên, chỉ giữ mã có thật và đang 'ready'.
  async findReadyCodesByTcCodes(tcCodes) {
    const res = await this.query(
      `SELECT ${CODE_EXPR} AS code
         FROM test_cases c
        WHERE c.tc_code = ANY($1::text[]) AND c.test_status = 'ready'
        ORDER BY c.tc_code`,
      [tcCodes],
    );
    return res.rows.map((r) => r.code);
  }
}

module.exports = CatalogRepository;
