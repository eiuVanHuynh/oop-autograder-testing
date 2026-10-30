const BaseRepository = require("./BaseRepository");

// Truy vấn bảng test_runs.
// Queries the test_runs table.
// Một case = MỘT kết quả: dòng execution_id lớn nhất của case đó trong run (CI đẩy /results
// hai lần thì bảng có hai dòng cho cùng test_id). GET /runs/:id/results cũng lọc đúng như vậy,
// nên số liệu dưới đây và bảng trên trang báo cáo không bao giờ lệch nhau.
const LAST_PER_CASE = `(
  SELECT DISTINCT ON (x.test_id) x.result_status
    FROM test_results x
   WHERE x.run_id = r.run_id
   ORDER BY x.test_id, x.execution_id DESC
)`;

// Trạng thái KHÔNG lưu thành cột riêng mà tính ra (backend-design mục 6):
//   finished_at IS NULL          → 'running'
//   final_status IS NOT NULL     → final_status (hủy / lỗi kích hoạt: chưa có dòng test_results nào)
//   có kết quả failed|timedOut   → 'failed'
//   có kết quả interrupted       → 'interrupted'
//   còn lại                      → 'passed'
// Nhờ vậy /ingest/runs/:id/finish chỉ cần ghi finished_at.
const STATUS_EXPR = `CASE
    WHEN r.finished_at IS NULL THEN 'running'
    WHEN r.final_status IS NOT NULL THEN r.final_status
    WHEN agg.failed_count > 0 THEN 'failed'
    WHEN agg.interrupted_count > 0 THEN 'interrupted'
    ELSE 'passed'
  END`;

class RunRepository extends BaseRepository {
  constructor() {
    super("test_runs", "run_id");
    // Bảng + cột status tính ra. Cột "status" luôn do câu SQL này quyết định.
    // Mọi câu SELECT của repository này đi qua đây, nên số case và tên người chạy chỉ cần
    // khai một lần: Dashboard/History hiện được cột Passed/Failed và tên thay cho "User #1".
    this.withStatus = `(
      SELECT r.*, ${STATUS_EXPR} AS status,
             u.full_name AS tester_name,
             agg.total_count, agg.passed_count, agg.failed_count
        FROM ${this.tableName} r
        LEFT JOIN users u ON u.user_id = r.tester_id
        LEFT JOIN LATERAL (
          SELECT count(*)::int AS total_count,
                 count(*) FILTER (WHERE d.result_status = 'passed')::int AS passed_count,
                 count(*) FILTER (WHERE d.result_status IN ('failed', 'timedOut'))::int AS failed_count,
                 count(*) FILTER (WHERE d.result_status = 'interrupted')::int AS interrupted_count
            FROM ${LAST_PER_CASE} d
        ) agg ON true
    ) t`;
  }

  async findById(id) {
    const res = await this.query(
      `SELECT * FROM ${this.withStatus} WHERE t.${this.primaryKey} = $1 LIMIT 1`,
      [id],
    );
    return res.rows[0] || null;
  }

  // Lịch sử chạy: lọc theo tên, trạng thái, khoảng ngày + phân trang (page/limit).
  // Không truyền limit → trả hết. Trả { data, meta }.
  async findAllWithFilters(filters = {}) {
    const params = [];
    let where = " WHERE 1=1";

    // ILIKE để không phân biệt hoa thường.
    if (filters.q) {
      params.push(`%${filters.q}%`);
      where += ` AND t.run_name ILIKE $${params.length}`;
    }
    if (filters.status) {
      params.push(String(filters.status).toLowerCase());
      where += ` AND t.status = $${params.length}`;
    }
    if (filters.from) {
      params.push(filters.from);
      where += ` AND t.created_at >= $${params.length}`;
    }
    if (filters.to) {
      params.push(filters.to);
      where += ` AND t.created_at <= $${params.length}`;
    }

    const countRes = await this.query(
      `SELECT COUNT(*)::int AS total FROM ${this.withStatus}${where}`,
      params,
    );
    const total = countRes.rows[0].total;

    let sql = `SELECT * FROM ${this.withStatus}${where} ORDER BY t.created_at DESC`;
    const limit = filters.limit ? Math.max(1, Number(filters.limit)) : null;
    const page = Math.max(1, Number(filters.page) || 1);
    const dataParams = [...params];
    if (limit) {
      dataParams.push(limit);
      sql += ` LIMIT $${dataParams.length}`;
      dataParams.push((page - 1) * limit);
      sql += ` OFFSET $${dataParams.length}`;
    }

    const res = await this.query(sql, dataParams);
    return { data: res.rows, meta: { page: limit ? page : 1, limit, total } };
  }

  // Tạo mới một lượt chạy test (đang chạy: finished_at còn NULL).
  // Cột started_at, browser, created_at lấy giá trị mặc định của DB (migration 008).
  // user_id của service = cột tester_id trong DB.
  async createRun(data) {
    const { run_name, user_id, environment, config_json } = data;
    const sql = `
      INSERT INTO ${this.tableName}
      (run_name, tester_id, environment, config_json)
      VALUES ($1, $2, $3, $4::jsonb)
      RETURNING ${this.primaryKey}
    `;
    const res = await this.query(sql, [run_name || "Unnamed Run", user_id, environment || null, config_json]);
    return res.rows[0][this.primaryKey];
  }

  // Lưu id lần chạy bên GitHub Actions để hủy được sau này.
  async setCiRunId(id, ciRunId) {
    const res = await this.query(
      `UPDATE ${this.tableName} SET ci_run_id = $1 WHERE ${this.primaryKey} = $2`,
      [String(ciRunId), id],
    );
    return res.rowCount > 0;
  }

  // Kết thúc một run: ghi giờ kết thúc + kết quả chung. Chỉ có tác dụng khi run còn đang chạy
  // (gọi lần hai trả false → nơi gọi quyết định có báo 409 hay không).
  async markFinished(id, finalStatus) {
    const res = await this.query(
      `UPDATE ${this.tableName}
          SET finished_at = NOW(), final_status = $1
        WHERE ${this.primaryKey} = $2 AND finished_at IS NULL`,
      [finalStatus, id],
    );
    return res.rowCount > 0;
  }
}

module.exports = RunRepository;
