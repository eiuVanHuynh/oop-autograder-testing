const BaseRepository = require("./BaseRepository");

// Queries against the test_runs table.
// One case = ONE result: the row with the highest execution_id for that case in the run (if CI pushes
// /results twice the table holds two rows for the same test_id). GET /runs/:id/results filters the same way,
// so the numbers below and the table on the report page can never disagree.
const LAST_PER_CASE = `(
  SELECT DISTINCT ON (x.test_id) x.result_status
    FROM test_results x
   WHERE x.run_id = r.run_id
   ORDER BY x.test_id, x.execution_id DESC
)`;

// The status is NOT stored in a column but computed (backend-design section 6):
//   finished_at IS NULL          → 'running'
//   final_status IS NOT NULL     → final_status (cancelled / trigger error: no test_results row yet)
//   any failed|timedOut result   → 'failed'
//   any interrupted result       → 'interrupted'
//   otherwise                    → 'passed'
// That way /ingest/runs/:id/finish only has to write finished_at.
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
    // The table + the computed status column. The "status" column is always decided by this SQL.
    // Every SELECT in this repository goes through here, so the case counts and the runner's name only need
    // declaring once: Dashboard/History can show Passed/Failed columns and a name instead of "User #1".
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

  // Run history: filter by name, status, date range + pagination (page/limit).
  // No limit passed → return everything. Returns { data, meta }.
  async findAllWithFilters(filters = {}) {
    const params = [];
    let where = " WHERE 1=1";

    // ILIKE so it is case-insensitive.
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

    // Đếm tổng và lấy trang không phụ thuộc nhau: chạy song song để chỉ mất một lượt đi-về DB.
    const [res, countRes] = await Promise.all([
      this.query(sql, dataParams),
      this.query(`SELECT COUNT(*)::int AS total FROM ${this.withStatus}${where}`, params),
    ]);
    return {
      data: res.rows,
      meta: { page: limit ? page : 1, limit, total: countRes.rows[0].total },
    };
  }

  // Create a new test run (still running: finished_at is NULL).
  // The started_at, browser and created_at columns take the DB defaults (migration 008).
  // The service's user_id is the tester_id column in the DB.
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

  // Store the GitHub Actions run id so it can be cancelled later.
  async setCiRunId(id, ciRunId) {
    const res = await this.query(
      `UPDATE ${this.tableName} SET ci_run_id = $1 WHERE ${this.primaryKey} = $2`,
      [String(ciRunId), id],
    );
    return res.rowCount > 0;
  }

  // End a run: write the finish time + overall result. Only takes effect while the run is still running
  // (a second call returns false → the caller decides whether to report 409).
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
