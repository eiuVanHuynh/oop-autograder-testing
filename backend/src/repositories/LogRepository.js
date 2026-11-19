const BaseRepository = require('./BaseRepository');

// The temporary run_logs table backing the live log panel. Scratch data, purged when the run ends.
class LogRepository extends BaseRepository {
  constructor() {
    super('run_logs', 'log_id');
  }

  // seq increases per run, which is what polling ?after=seq relies on.
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

  // Many rows at once (the CI reporter pushes in batches). One query: seq continues from the current
  // MAX(seq) and keeps the order of the array sent, so polling ?after= never duplicates or skips a line.
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
