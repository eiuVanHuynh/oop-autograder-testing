const { query } = require('../config/db');

// Template Method: this class holds all the shared SQL, a child repo only declares its table name.
// This is the ONLY layer allowed to write SQL. Services call repositories, never db.
//
// To do:
// - findById, findAll(filter), paginate({ page, pageSize }), insert, update, remove.
// - Always parameterize ($1, $2…), never concatenate SQL — avoids SQL injection.
// - Return raw rows (snake_case). Converting to camelCase belongs to utils/mappers.js.
// - A child repo needing its own SQL adds a method of its own; it does not edit this class.
class BaseRepository {
  constructor(tableName, primaryKey) {
    this.tableName = tableName;
    this.primaryKey = primaryKey;
  }

  // Every child repo calls this.query() instead of requiring db directly.
  query(sql, params) {
    return query(sql, params);
  }

  async findById(id) {
    const res = await this.query(
      `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = $1 LIMIT 1`,
      [id],
    );
    return res.rows[0] || null;
  }

  async delete(id) {
    const res = await this.query(
      `DELETE FROM ${this.tableName} WHERE ${this.primaryKey} = $1`,
      [id],
    );
    return res.rowCount > 0;
  }

  // shortcut: no shared findAll/paginate/insert/update yet — add them when a second repo needs them.
}

module.exports = BaseRepository;
