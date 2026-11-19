const BaseRepository = require("./BaseRepository");

// Queries against the new test_templates table – what the user picks to run.
//
// To do:
// - CRUD + search by name/scope; a duplicate template_name → let the UNIQUE error surface as 409.
// - target_json is NOT NULL: a template pointing at no test is a useless template.
// - Deleting a template does NOT touch run history (test_runs already snapshotted it into config_json).
class TemplateRepository extends BaseRepository {
  constructor() {
    super("test_templates", "template_id");
  }

  // Search the template list with optional filters (q for the name, scope for the scope)
  async findAllWithFilters(filters = {}) {
    let sql = `SELECT * FROM ${this.tableName} WHERE 1=1`;
    const params = [];

    if (filters.q) {
      params.push(`%${filters.q}%`);
      sql += ` AND template_name ILIKE $${params.length}`;
    }

    if (filters.scope) {
      params.push(filters.scope);
      sql += ` AND scope = $${params.length}`;
    }

    if (filters.status) {
      params.push(filters.status);
      sql += ` AND status = $${params.length}`;
    }

    sql += " ORDER BY created_at DESC";
    const res = await this.query(sql, params);
    return res.rows;
  }

  // Find a template by exact name (used for the duplicate check that returns 409)
  async findByName(templateName) {
    const sql = `SELECT * FROM ${this.tableName} WHERE template_name = $1`;
    const res = await this.query(sql, [templateName]);
    return res.rows[0] || null;
  }

  // Create a template
  async createTemplate(data) {
    const {
      template_name,
      description,
      scope,
      target_json,
      env,
      timeout,
      status,
      created_by,
    } = data;
    const sql = `
      INSERT INTO ${this.tableName} 
      (template_name, description, scope, target_json, env, timeout, status, created_by) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING ${this.primaryKey}
    `;
    // target_json is JSONB (backend-design.md section 6): pg serializes the object itself.
    // shortcut: if the DB team makes this column TEXT, it has to be wrapped in JSON.stringify again.
    const res = await this.query(sql, [
      template_name,
      description || null,
      scope || "UI",
      target_json,
      env || "development",
      timeout || 30000,
      status || "active",
      created_by,
    ]);
    return res.rows[0][this.primaryKey];
  }

  // Update a template
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
      "status",
    ];
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        params.push(data[field]);
        fields.push(`${field} = $${params.length}`);
      }
    }

    if (fields.length === 0) return false;

    fields.push("updated_at = NOW()");

    params.push(id);
    const sql = `UPDATE ${this.tableName} SET ${fields.join(", ")} WHERE ${this.primaryKey} = $${params.length}`;
    const res = await this.query(sql, params);
    return res.rowCount > 0;
  }
}

module.exports = TemplateRepository;
