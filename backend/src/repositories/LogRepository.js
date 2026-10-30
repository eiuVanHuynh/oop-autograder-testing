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

  // Nhiều dòng một lượt (reporter của CI đẩy theo lô). Một truy vấn: seq cấp liên tiếp từ
  // MAX(seq) hiện có, giữ đúng thứ tự mảng gửi lên để polling ?after= không trùng/thiếu dòng.
  async appendMany(runId, lines) {
    if (!lines || !lines.length) return 0;
    const res = await this.query(
      `INSERT INTO ${this.tableName} (run_id, seq, level, message)
       SELECT $1, base.m + t.ord, t.level, t.message
         FROM (SELECT COALESCE(MAX(seq), 0) AS m FROM ${this.tableName} WHERE run_id = $1) base,
              unnest($2::text[], $3::text[]) WITH ORDINALITY AS t(level, message, ord)`,
      [runId, lines.map((l) => l.level || 'info'), lines.map((l) => String(l.message ?? ''))],
    );
    return res.rowCount;
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
