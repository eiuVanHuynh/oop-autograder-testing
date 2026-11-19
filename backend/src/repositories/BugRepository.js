const BaseRepository = require("./BaseRepository");

// Queries against the bugs table (migration 013) – defects reported from a failed test result.
class BugRepository extends BaseRepository {
  constructor() {
    super("bugs", "bug_id");
  }

  async createBug({ result_id, title, description, severity, created_by }) {
    const res = await this.query(
      `INSERT INTO ${this.tableName} (result_id, title, description, severity, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [result_id, title, description ?? null, severity, created_by],
    );
    return res.rows[0];
  }

  // Bug list, filtered by status + severity. Includes the test code so the UI needs no extra call.
  async findAllWithFilters(filters = {}) {
    const params = [];
    let where = " WHERE 1=1";

    if (filters.status) {
      params.push(filters.status);
      where += ` AND b.status = $${params.length}`;
    }
    if (filters.severity) {
      params.push(filters.severity);
      where += ` AND b.severity = $${params.length}`;
    }

    const res = await this.query(
      `SELECT b.*, c.tc_code, r.run_id, u.full_name AS reporter_name
         FROM ${this.tableName} b
         JOIN test_results r ON r.execution_id = b.result_id
         JOIN test_cases c   ON c.test_id = r.test_id
         LEFT JOIN users u   ON u.user_id = b.created_by
       ${where}
        ORDER BY b.created_at DESC`,
      params,
    );
    return res.rows;
  }

  // Update a bug – usually just a status change. No matching row → null.
  async updateBug(id, data) {
    const allowedFields = ["title", "description", "severity", "status"];
    const fields = [];
    const params = [];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        params.push(data[field]);
        fields.push(`${field} = $${params.length}`);
      }
    }

    if (fields.length === 0) return null;

    params.push(id);
    const res = await this.query(
      `UPDATE ${this.tableName} SET ${fields.join(", ")}
        WHERE ${this.primaryKey} = $${params.length}
       RETURNING *`,
      params,
    );
    return res.rows[0] || null;
  }
}

module.exports = BugRepository;
