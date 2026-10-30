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

  // Kết quả từng case của một run, kèm bằng chứng (screenshot/trace) — trang báo cáo dùng.
  // Nhờ có nó, frontend không phải bóc pass/fail từ chuỗi log nữa.
  async findByRun(runId) {
    // DISTINCT ON: một case chỉ một dòng, lấy execution_id lớn nhất. CI đẩy /results hai lần
    // (workflow bị dispatch lại cùng RUN_ID) thì bảng có hai dòng cho cùng test_id; trang báo
    // cáo khoá theo tc_code nên hai dòng sẽ thành hai hàng mâu thuẫn. Giữ lần chạy cuối, đúng
    // như cách đọc log cũ ("dòng sau đè dòng trước").
    const res = await this.query(
      `SELECT DISTINCT ON (r.test_id)
              r.${this.primaryKey}, r.test_id, c.tc_code, c.title,
              r.result_status, r.actual_result, r.execution_time_ms,
              r.error_message, r.retry_count,
              COALESCE(
                json_agg(
                  json_build_object('evidence_id', e.evidence_id,
                                    'evidence_type', e.evidence_type,
                                    'file_path', e.file_path)
                  ORDER BY e.evidence_id
                ) FILTER (WHERE e.evidence_id IS NOT NULL),
                '[]'
              ) AS evidences
         FROM ${this.tableName} r
         JOIN test_cases c ON c.test_id = r.test_id
         LEFT JOIN test_evidences e ON e.result_id = r.${this.primaryKey}
        WHERE r.run_id = $1
        GROUP BY r.${this.primaryKey}, r.test_id, c.tc_code, c.title
        ORDER BY r.test_id, r.${this.primaryKey} DESC`,
      [runId],
    );
    return res.rows;
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
