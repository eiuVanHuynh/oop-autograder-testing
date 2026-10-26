const BaseRepository = require('./BaseRepository');

// Bảng tạm run_logs cho khung log trực tiếp. Dữ liệu tạm, xóa khi run kết thúc (purge).
// Temporary run_logs table behind the live log panel.
class LogRepository extends BaseRepository {
  constructor() {
    super('run_logs', 'log_id');
  }

  // seq tăng dần theo từng run, phục vụ polling ?after=seq.
  async append(runId, level, message) {
    const res = await this.query(
      `INSERT INTO ${this.tableName} (run_id, seq, level, message)
       SELECT $1, COALESCE(MAX(seq), 0) + 1, $2, $3
         FROM ${this.tableName} WHERE run_id = $1
       RETURNING seq`,
      [runId, level || 'info', message],
    );
    return res.rows[0].seq;
  }

  async findAfter(runId, afterSeq = 0, limit = 500) {
    const res = await this.query(
      `SELECT seq, level, message FROM ${this.tableName}
        WHERE run_id = $1 AND seq > $2
        ORDER BY seq ASC LIMIT $3`,
      [runId, afterSeq, limit],
    );
    return res.rows;
  }

  async purge(runId) {
    const res = await this.query(`DELETE FROM ${this.tableName} WHERE run_id = $1`, [runId]);
    return res.rowCount;
  }
}

module.exports = LogRepository;
