const BaseRepository = require('./BaseRepository');
const { CODE_EXPR } = require('./CatalogRepository');

// Truy vấn test_results và bằng chứng kèm theo.
// Queries test_results and their attached evidence.
//
// Khóa chính của bảng là execution_id (db/schema), không phải result_id.
//
// Cần làm / To do:
// - Ghi nhiều kết quả một lần (bulk insert) cho /ingest/runs/:id/results.
// - Đọc theo run để dựng bảng từng bước ở trang báo cáo.
class ResultRepository extends BaseRepository {
  constructor() {
    super('test_results', 'execution_id');
  }

  // Ghi kết quả của một test case theo mã test (tc_code hoặc automation_ref).
  // Mã không có trong test_cases → không ghi gì, trả null (nơi gọi tự ghi log).
  async recordForCode(runId, code, { status, ms = 0, actual = null, error = null }) {
    const res = await this.query(
      `INSERT INTO ${this.tableName}
         (run_id, test_id, result_status, actual_result, execution_time_ms, error_message)
       SELECT $1, c.test_id, $3, $4, $5, $6
         FROM test_cases c
        WHERE ${CODE_EXPR} = $2
        LIMIT 1
       RETURNING ${this.primaryKey}`,
      [runId, code, status, actual, Math.max(0, Math.round(ms)), error],
    );
    return res.rows[0] ? res.rows[0][this.primaryKey] : null;
  }

  // Nhiều kết quả một lượt cho POST /ingest/runs/:id/results.
  // Trả về danh sách mã không tìm thấy trong test_cases để nơi gọi báo lại cho CI.
  async recordMany(runId, items) {
    const unknown = [];
    for (const item of items) {
      const id = await this.recordForCode(runId, item.code, item);
      if (!id) unknown.push(item.code);
    }
    return { saved: items.length - unknown.length, unknown };
  }
}

module.exports = ResultRepository;
