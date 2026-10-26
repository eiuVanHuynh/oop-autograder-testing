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

    // ILIKE để giữ nguyên hành vi không phân biệt hoa thường của collation MySQL _ci
    if (filters.q) {
      params.push(`%${filters.q}%`);
      sql += ` AND run_name ILIKE $${params.length}`;
    }

    if (filters.from) {
      params.push(filters.from);
      sql += ` AND created_at >= $${params.length}`;
    }

    if (filters.to) {
      params.push(filters.to);
      sql += ` AND created_at <= $${params.length}`;
    }

    sql += " ORDER BY created_at DESC";

    // Hỗ trợ phân trang nếu có limit/page hoặc offset
    if (filters.limit) {
      params.push(Number(filters.limit));
      sql += ` LIMIT $${params.length}`;

      if (filters.offset) {
        params.push(Number(filters.offset));
        sql += ` OFFSET $${params.length}`;
      }
    }

    const res = await this.query(sql, params);
    return res.rows;
  }

  // Tạo mới một lượt chạy test
  async createRun(data) {
    const { run_name, user_id, config_json } = data;
    const sql = `
      INSERT INTO ${this.tableName} 
      (run_name, user_id, config_json, created_at) 
      VALUES ($1, $2, $3, NOW())
      RETURNING ${this.primaryKey}
    `;
    // config_json là JSONB (backend-design.md mục 6): pg tự tuần tự hóa object.
    // shortcut: nếu nhóm DB làm cột này thành TEXT thì phải bọc lại JSON.stringify.
    const res = await this.query(sql, [run_name || "Unnamed Run", user_id, config_json]);
    return res.rows[0][this.primaryKey];
  }

  // Cập nhật trạng thái hoặc thông tin thời gian kết thúc (để suy ra trạng thái completed/failed/interrupted)
  async updateStatus(id, status, extraFields = {}) {
    const params = [status];
    const fields = [`status = $${params.length}`];

    if (
      status === "completed" ||
      status === "failed" ||
      status === "interrupted" ||
      status === "passed"
    ) {
      fields.push("finished_at = NOW()");
    }

    for (const [key, value] of Object.entries(extraFields)) {
      params.push(value);
      fields.push(`${key} = $${params.length}`);
    }

    params.push(id);
    const sql = `UPDATE ${this.tableName} SET ${fields.join(", ")} WHERE ${this.primaryKey} = $${params.length}`;
    const res = await this.query(sql, params);
    return res.rowCount > 0;
  }
}

module.exports = RunRepository;
