const BaseRepository = require("./BaseRepository");

// Queries against the rerun_requests table (migration 016) – Dev asks for a rerun, Admin/Tester decides.
//
// Every read returns the ORIGINAL run's config as well: after an approval the UI opens the Run Test page
// with the template already filled in, so it must not need a second call to /runs/:id to know what to fill.
const SELECT_WITH_RUN = `
  SELECT q.*, r.run_name, r.environment, r.config_json AS run_config,
         u.full_name AS requester_name, d.full_name AS decider_name
    FROM rerun_requests q
    JOIN test_runs r  ON r.run_id = q.run_id
    LEFT JOIN users u ON u.user_id = q.requested_by
    LEFT JOIN users d ON d.user_id = q.decided_by`;

class RerunRequestRepository extends BaseRepository {
  constructor() {
    super("rerun_requests", "request_id");
  }

  // Unique violation (23505) on ux_rerun_requests_pending = this run already has a pending request;
  // the service turns it into a 409. Checking first instead would still let two clicks through.
  async createRequest({ run_id, reason, requested_by }) {
    const res = await this.query(
      `INSERT INTO ${this.tableName} (run_id, reason, requested_by)
       VALUES ($1, $2, $3)
       RETURNING request_id`,
      [run_id, reason ?? null, requested_by],
    );
    return this.findByIdWithRun(res.rows[0].request_id);
  }

  async findByIdWithRun(id) {
    const res = await this.query(`${SELECT_WITH_RUN} WHERE q.request_id = $1`, [id]);
    return res.rows[0] || null;
  }

  async findAllWithFilters(filters = {}) {
    const params = [];
    let where = "";
    if (filters.status) {
      params.push(filters.status);
      where = ` WHERE q.status = $${params.length}`;
    }
    const res = await this.query(`${SELECT_WITH_RUN}${where} ORDER BY q.created_at DESC`, params);
    return res.rows;
  }

  // Admin fixing a decision: ANY status may be set, including back to 'pending' (approved by mistake,
  // or approved and never actually run). Back to pending clears who decided — keeping the old decider
  // on a waiting request would read as "already handled".
  // CASE thay vì ghép chuỗi theo status: để lại $2 mà không dùng thì Postgres trả 42P18
  // ("could not determine data type of parameter $2"). $2::int vì CASE còn lại là NULL nên
  // Postgres không tự suy ra kiểu của tham số.
  async setStatus(id, status, decided_by) {
    const res = await this.query(
      `UPDATE ${this.tableName}
          SET status = $1::text,
              decided_by = CASE WHEN $1::text = 'pending' THEN NULL ELSE $2::int END,
              decided_at = CASE WHEN $1::text = 'pending' THEN NULL ELSE now() END
        WHERE ${this.primaryKey} = $3
       RETURNING ${this.primaryKey}`,
      [status, decided_by, id],
    );
    return res.rowCount > 0 ? this.findByIdWithRun(id) : null;
  }

  // Only a pending request can be decided, so the condition sits in the WHERE: no row back means
  // "no such request" OR "already decided", and the service tells the two apart by re-reading.
  async decide(id, status, decided_by) {
    const res = await this.query(
      `UPDATE ${this.tableName}
          SET status = $1, decided_by = $2, decided_at = now()
        WHERE ${this.primaryKey} = $3 AND status = 'pending'
       RETURNING ${this.primaryKey}`,
      [status, decided_by, id],
    );
    return res.rowCount > 0 ? this.findByIdWithRun(id) : null;
  }
}

module.exports = RerunRequestRepository;
