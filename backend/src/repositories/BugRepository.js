const BaseRepository = require("./BaseRepository");

// Truy vấn bảng bugs (migration 013) – lỗi phần mềm báo từ một kết quả test Fail.
// Queries the bugs table – software bugs raised from a failed test result.
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

  // Danh sách lỗi, lọc theo trạng thái + mức độ. Kèm mã test để giao diện không phải hỏi thêm.
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

  // Cập nhật lỗi – thường chỉ là đổi status. Không có dòng nào khớp → null.
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
