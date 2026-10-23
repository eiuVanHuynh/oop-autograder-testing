const BaseRepository = require("./BaseRepository");

// Truy vấn bảng test_runs.
// Queries the test_runs table.
//
// Cần làm / To do:
// - Lọc theo tên/trạng thái/khoảng ngày + phân trang cho trang Lịch sử.
// - KHÔNG có cột run_status: trạng thái tính ra từ finished_at và test_results (backend-design mục 6).
class RunRepository extends BaseRepository {
  constructor() {
    super("test_runs", "run_id");
  }

  // Lấy danh sách chạy test với bộ lọc (tên, khoảng ngày) và phân trang
  async findAllWithFilters(filters = {}) {
    let sql = `SELECT * FROM ${this.tableName} WHERE 1=1`;
    const params = [];

    if (filters.q) {
      sql += " AND run_name LIKE ?";
      params.push(`%${filters.q}%`);
    }

    if (filters.from) {
      sql += " AND created_at >= ?";
      params.push(filters.from);
    }

    if (filters.to) {
      sql += " AND created_at <= ?";
      params.push(filters.to);
    }

    sql += " ORDER BY created_at DESC";

    // Hỗ trợ phân trang nếu có limit/page hoặc offset
    if (filters.limit) {
      sql += " LIMIT ?";
      params.push(Number(filters.limit));

      if (filters.offset) {
        sql += " OFFSET ?";
        params.push(Number(filters.offset));
      }
    }

    return await this.query(sql, params);
  }

  // Tạo mới một lượt chạy test
  async createRun(data) {
    const { run_name, user_id, config_json } = data;
    const sql = `
      INSERT INTO ${this.tableName} 
      (run_name, user_id, config_json, created_at) 
      VALUES (?, ?, ?, NOW())
    `;
    const result = await this.query(sql, [
      run_name || "Unnamed Run",
      user_id,
      typeof config_json === "string"
        ? config_json
        : JSON.stringify(config_json),
    ]);
    return result.insertId;
  }

  // Cập nhật trạng thái hoặc thông tin thời gian kết thúc (để suy ra trạng thái completed/failed/interrupted)
  async updateStatus(id, status, extraFields = {}) {
    let fields = ["status = ?"];
    const params = [status];

    if (
      status === "completed" ||
      status === "failed" ||
      status === "interrupted" ||
      status === "passed"
    ) {
      fields.push("finished_at = NOW()");
    }

    for (const [key, value] of Object.entries(extraFields)) {
      fields.push(`${key} = ?`);
      params.push(value);
    }

    params.push(id);
    const sql = `UPDATE ${this.tableName} SET ${fields.join(", ")} WHERE ${this.primaryKey} = ?`;
    const result = await this.query(sql, params);
    return result.affectedRows > 0;
  }
}

module.exports = RunRepository;
