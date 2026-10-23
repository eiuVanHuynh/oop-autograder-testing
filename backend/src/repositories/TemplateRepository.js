const BaseRepository = require("./BaseRepository");

// Truy vấn bảng mới test_templates – thứ người dùng chọn để chạy.
// Queries the new test_templates table – what the user picks to run.
//
// Cần làm / To do:
// - CRUD + tìm theo tên/phạm vi; trùng template_name → để lỗi UNIQUE nổi lên thành 409.
// - target_json là NOT NULL: template không trỏ tới test nào là template vô dụng.
// - Xóa template KHÔNG đụng tới lịch sử chạy (test_runs đã chụp grep vào config_json).
class TemplateRepository extends BaseRepository {
  constructor() {
    super("test_templates", "template_id");
  }

  // Tìm kiếm danh sách template với bộ lọc tùy chọn (q cho tên, scope cho phạm vi)
  async findAllWithFilters(filters = {}) {
    let sql = `SELECT * FROM ${this.tableName} WHERE 1=1`;
    const params = [];

    if (filters.q) {
      sql += " AND template_name LIKE ?";
      params.push(`%${filters.q}%`);
    }

    if (filters.scope) {
      sql += " AND scope = ?";
      params.push(filters.scope);
    }

    sql += " ORDER BY created_at DESC";
    return await this.query(sql, params);
  }

  // Tìm template theo tên chính xác (phục vụ kiểm tra trùng lặp để trả 409)
  async findByName(templateName) {
    const sql = `SELECT * FROM ${this.tableName} WHERE template_name = ?`;
    const rows = await this.query(sql, [templateName]);
    return rows[0] || null;
  }

  // Tạo mới template
  async createTemplate(data) {
    const {
      template_name,
      description,
      scope,
      target_json,
      env,
      timeout,
      created_by,
    } = data;
    const sql = `
      INSERT INTO ${this.tableName} 
      (template_name, description, scope, target_json, env, timeout, created_by) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const result = await this.query(sql, [
      template_name,
      description || null,
      scope || "UI",
      JSON.stringify(target_json),
      env || "development",
      timeout || 30000,
      created_by,
    ]);
    return result.insertId;
  }

  // Cập nhật template
  async updateTemplate(id, data) {
    const fields = [];
    const params = [];

    const allowedFields = [
      "template_name",
      "description",
      "scope",
      "target_json",
      "env",
      "timeout",
    ];
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        fields.push(`${field} = ?`);
        params.push(
          field === "target_json" ? JSON.stringify(data[field]) : data[field],
        );
      }
    }

    if (fields.length === 0) return false;

    params.push(id);
    const sql = `UPDATE ${this.tableName} SET ${fields.join(", ")} WHERE ${this.primaryKey} = ?`;
    const result = await this.query(sql, params);
    return result.affectedRows > 0;
  }
}

module.exports = TemplateRepository;
