const BaseRepository = require('./BaseRepository');
const { CODE_EXPR } = require('./CatalogRepository');

// Queries against test_results and its attached evidence.
//
// The table's primary key is execution_id (db/schema), not result_id.
//
// To do:
// - Write many results at once (bulk insert) for /ingest/runs/:id/results.
// - Read by run to build the step-by-step table on the report page.
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
  async recordMany(runId, items) {
    const unknown = [];
    for (const item of items) {
      const id = await this.recordForCode(runId, item.code, item);
      if (!id) unknown.push(item.code);
    }
    return { saved: items.length - unknown.length, unknown };
  }
}

module.exports = ResultRepository;
