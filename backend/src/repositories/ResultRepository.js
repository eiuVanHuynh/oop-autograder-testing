const BaseRepository = require('./BaseRepository');
const { CODE_EXPR } = require('./CatalogRepository');

// Queries against test_results and its attached evidence.
//
// The table's primary key is execution_id (db/schema), not result_id.
//
// Evidence (screenshot/trace) stores a LOCATION, never the bytes: Vercel's filesystem is read-only and
// the project uses no object storage, so CI uploads to its GitHub Actions artifact and sends the URL here.
// shortcut: a GitHub artifact URL expires (90 days by default), so an old run's links eventually 404 —
// swap file_path for a real storage key if evidence has to outlive the artifact.
class ResultRepository extends BaseRepository {
  constructor() {
    super('test_results', 'execution_id');
  }

  // Write the result of one test case by test code (tc_code or automation_ref).
  // A code not present in test_cases → nothing written, returns null (the caller logs it).
  async recordForCode(runId, code, { status, ms = 0, actual = null, error = null }) {
    const res = await this.query(
      `INSERT INTO ${this.tableName}
         (run_id, test_id, result_status, actual_result, execution_time_ms, error_message)
       SELECT $1, c.test_id, $3, $4, $5, $6
         FROM test_cases c
        WHERE ${CODE_EXPR} = $2
        LIMIT 1
       RETURNING ${this.primaryKey}`,
      [runId, code, status, actual, Math.max(0, Math.round(ms)), error],
    );
    return res.rows[0] ? res.rows[0][this.primaryKey] : null;
  }

  // Per-case results of a run, with evidence (screenshot/trace) — used by the report page.
  // Thanks to it, the frontend no longer has to scrape pass/fail out of the log text.
  async findByRun(runId) {
    // DISTINCT ON: one row per case, taking the highest execution_id. If CI pushes /results twice
    // (the workflow is re-dispatched with the same RUN_ID) the table holds two rows for one test_id; the report
    // page keys on tc_code, so two rows would become two contradictory lines. Keep the last run, exactly
    // like the old log reading did ("a later line overrides an earlier one").
    const res = await this.query(
      `SELECT DISTINCT ON (r.test_id)
              r.${this.primaryKey}, r.test_id, c.tc_code, c.title,
              r.result_status, r.actual_result, r.execution_time_ms,
              r.error_message, r.retry_count,
              COALESCE(
                json_agg(
                  json_build_object('evidence_id', e.evidence_id,
                                    'evidence_type', e.evidence_type,
                                    'file_path', e.file_path)
                  ORDER BY e.evidence_id
                ) FILTER (WHERE e.evidence_id IS NOT NULL),
                '[]'
              ) AS evidences
         FROM ${this.tableName} r
         JOIN test_cases c ON c.test_id = r.test_id
         LEFT JOIN test_evidences e ON e.result_id = r.${this.primaryKey}
        WHERE r.run_id = $1
        GROUP BY r.${this.primaryKey}, r.test_id, c.tc_code, c.title
        ORDER BY r.test_id, r.${this.primaryKey} DESC`,
      [runId],
    );
    return res.rows;
  }

  // Many results at once for POST /ingest/runs/:id/results.
  // Returns the list of codes not found in test_cases so the caller can report them back to CI.
  //
  // Two queries whatever the number of results, not one per result: CI pushes the whole run in one
  // call (a 50-case run meant 50 round trips to the DB while the workflow waited), and a single
  // INSERT either writes every row or none, instead of leaving half a run's results behind on failure.
  async recordMany(runId, items) {
    if (!items || !items.length) return { saved: 0, unknown: [] };

    const codes = items.map((i) => i.code);
    // One test_id per code: CODE_EXPR has no unique index, and LIMIT 1 is what recordForCode did.
    const found = await this.query(
      `SELECT DISTINCT ON (code) code, test_id
         FROM (SELECT ${CODE_EXPR} AS code, c.test_id
                 FROM test_cases c
                WHERE ${CODE_EXPR} = ANY($1::text[])) x
        ORDER BY code, test_id`,
      [codes],
    );
    const idByCode = new Map(found.rows.map((r) => [r.code, r.test_id]));

    const known = items.filter((i) => idByCode.has(i.code));
    const unknown = codes.filter((code) => !idByCode.has(code));
    if (!known.length) return { saved: 0, unknown };

    await this.query(
      `INSERT INTO ${this.tableName}
         (run_id, test_id, result_status, actual_result, execution_time_ms, error_message)
       SELECT $1, t.test_id, t.status, t.actual, t.ms, t.error
         FROM unnest($2::int[], $3::text[], $4::text[], $5::int[], $6::text[])
              AS t(test_id, status, actual, ms, error)`,
      [
        runId,
        known.map((i) => idByCode.get(i.code)),
        known.map((i) => i.status),
        known.map((i) => i.actual ?? null),
        known.map((i) => Math.max(0, Math.round(i.ms || 0))),
        known.map((i) => i.error ?? null),
      ],
    );
    return { saved: known.length, unknown };
  }

  // Bằng chứng của một kết quả, ghi một lệnh bất kể bao nhiêu dòng (CI gửi cả lượt một lần).
  async addEvidences(resultId, items) {
    if (!items || !items.length) return 0;
    const res = await this.query(
      `INSERT INTO test_evidences (result_id, evidence_type, file_path)
       SELECT $1, t.type, t.path
         FROM unnest($2::text[], $3::text[]) AS t(type, path)`,
      [resultId, items.map((i) => i.type), items.map((i) => i.path)],
    );
    return res.rowCount;
  }

  // Bằng chứng của một kết quả TRONG một lần chạy. LEFT JOIN để một truy vấn phân biệt được
  // "kết quả không thuộc run này" (0 dòng → null → 404) với "có kết quả nhưng chưa có bằng chứng"
  // (1 dòng evidence_id rỗng → danh sách rỗng).
  async findEvidences(runId, resultId) {
    const res = await this.query(
      `SELECT e.evidence_id, e.evidence_type, e.file_path, e.created_at
         FROM ${this.tableName} r
         LEFT JOIN test_evidences e ON e.result_id = r.${this.primaryKey}
        WHERE r.run_id = $1 AND r.${this.primaryKey} = $2
        ORDER BY e.evidence_id`,
      [runId, resultId],
    );
    if (!res.rows.length) return null;
    return res.rows.filter((row) => row.evidence_id !== null);
  }
}

module.exports = ResultRepository;
