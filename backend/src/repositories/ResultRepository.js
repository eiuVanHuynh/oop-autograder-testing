const BaseRepository = require('./BaseRepository');
const { CODE_EXPR } = require('./CatalogRepository');

// Queries against test_results and its attached evidence.
//
// The table's primary key is execution_id (db/schema), not result_id.
//
// Evidence (screenshot/trace) holds the FILE ITSELF in test_evidences.content, with file_path as the
// URL it is read back from (/api/evidences/<token>, behind a login). Bytes live in Postgres because
// Vercel's filesystem is read-only and the project has no object storage; the runner's own path is gone
// the moment the workflow ends, which is why storing only a path left every report with blank images.
// shortcut: Postgres is not a CDN — move content to object storage and keep only a key here once
// evidence volume (a screenshot per failed case per run) starts to matter.
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
                                    'file_path', e.file_path,
                                    -- token: khóa để GỌI GET /evidences/:token kèm Authorization.
                                    -- file_path không tải thẳng được nữa (route đã có requireAuth).
                                    'token', e.token)
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
    if (!items || !items.length) return { saved: 0, unknown: [], results: [] };

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
    // results luôn có mặt, kể cả rỗng: nơi gọi (reporter của CI) đọc thẳng saved.data.results.
    if (!known.length) return { saved: 0, unknown, results: [] };

    // RETURNING execution_id: CI cần nó để gắn ảnh vào đúng kết quả, mà đường duy nhất khác để biết
    // là GET /runs/:id/results — route đó đòi JWT người dùng, runner không có.
    // Lấy kèm test_id vì RETURNING không bảo đảm thứ tự để ghép lại với mảng `known`.
    const inserted = await this.query(
      `INSERT INTO ${this.tableName}
         (run_id, test_id, result_status, actual_result, execution_time_ms, error_message)
       SELECT $1, t.test_id, t.status, t.actual, t.ms, t.error
         FROM unnest($2::int[], $3::text[], $4::text[], $5::int[], $6::text[])
              AS t(test_id, status, actual, ms, error)
       RETURNING ${this.primaryKey}, test_id`,
      [
        runId,
        known.map((i) => idByCode.get(i.code)),
        known.map((i) => i.status),
        known.map((i) => i.actual ?? null),
        known.map((i) => Math.max(0, Math.round(i.ms || 0))),
        known.map((i) => i.error ?? null),
      ],
    );
    const codeById = new Map([...idByCode].map(([code, testId]) => [testId, code]));
    return {
      saved: known.length,
      unknown,
      results: inserted.rows.map((r) => ({
        code: codeById.get(r.test_id),
        executionId: r[this.primaryKey],
      })),
    };
  }

  // Bằng chứng của một kết quả, ghi một lệnh bất kể bao nhiêu dòng (CI gửi cả lượt một lần).
  // `items`: [{ type, path, content?: Buffer, mime?, token? }] — service đã dựng sẵn (xem ingest.service).
  // content rỗng thì dòng đó chỉ là đường dẫn (trace nặng vài MB không nhúng vào DB).
  async addEvidences(resultId, items) {
    if (!items || !items.length) return 0;
    const res = await this.query(
      `INSERT INTO test_evidences (result_id, evidence_type, file_path, content, mime_type, token)
       SELECT $1, t.type, t.path, t.content, t.mime, t.token
         FROM unnest($2::text[], $3::text[], $4::bytea[], $5::text[], $6::uuid[])
              AS t(type, path, content, mime, token)`,
      [
        resultId,
        items.map((i) => i.type),
        items.map((i) => i.path),
        items.map((i) => i.content ?? null),
        items.map((i) => i.mime ?? null),
        items.map((i) => i.token ?? null),
      ],
    );
    return res.rowCount;
  }

  // Một file bằng chứng theo token (GET /api/evidences/:token). Không có content → null,
  // vì một dòng chỉ-đường-dẫn không có gì để trả về.
  async findFileByToken(token) {
    const res = await this.query(
      `SELECT content, mime_type, evidence_type
         FROM test_evidences
        WHERE token = $1 AND content IS NOT NULL
        LIMIT 1`,
      [token],
    );
    return res.rows[0] || null;
  }

  // Bằng chứng của một kết quả TRONG một lần chạy. LEFT JOIN để một truy vấn phân biệt được
  // "kết quả không thuộc run này" (0 dòng → null → 404) với "có kết quả nhưng chưa có bằng chứng"
  // (1 dòng evidence_id rỗng → danh sách rỗng).
  async findEvidences(runId, resultId) {
    const res = await this.query(
      `SELECT e.evidence_id, e.evidence_type, e.file_path, e.token, e.created_at
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
