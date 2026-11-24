const BaseRepository = require("./BaseRepository");
const { getPool } = require("../config/db");
// Reads test_suites / test_specs / test_cases – where tests are declared.
//
// Only takes test_status = 'ready'. Prefers automation_ref when present, otherwise tc_code.
// Assumed columns (db/schema): test_cases(spec_id, tc_code, automation_ref, test_status),
// test_specs(spec_id, suite_id). If the real schema names them differently, fix the 2 queries below.
// The write side (CRUD suite/spec/case) is 🟡, later.
const CODE_EXPR = "COALESCE(NULLIF(c.automation_ref, ''), c.tc_code)";

// The test_data rows of ONE case → a field_name → data_value map for the test runner.
// Two rows with the same field_name no longer silently override each other by data_id order: the
// is_valid = false row wins, because a value marked invalid only exists for a negative case to type in.
// Within the same group the first row (lowest data_id) wins.
//
// shortcut: this is a cleanup rule for duplicate data already in the DB, NOT a
// "one flow, several data sets" feature — running one flow twice (a valid and an invalid set) needs a
// test_data.variant column + a data-set label in test_results so the report page can tell apart
// two rows with the same tc_code. Do it once the FE is ready to show that label. The API door (PUT .../data)
// already blocks creating more duplicate rows, so this rule now only applies to old seed/psql data.
function toDataMap(rows) {
  const data = {};
  const fromInvalid = new Set();
  for (const r of rows) {
    const invalid = r.is_valid === false;
    if (r.field_name in data && (fromInvalid.has(r.field_name) || !invalid)) continue;
    data[r.field_name] = r.data_value;
    if (invalid) fromInvalid.add(r.field_name);
  }
  return data;
}

class CatalogRepository extends BaseRepository {
  constructor() {
    super("test_suites", "suite_id");
  }

  // The 'ready' test codes of a suite, used to build --grep.
  async findReadyCaseCodes(suiteId) {
    const res = await this.query(
      `SELECT ${CODE_EXPR} AS code
         FROM test_cases c
         JOIN test_specs s ON s.spec_id = c.spec_id
        WHERE s.suite_id = $1 AND c.test_status = 'ready'
        ORDER BY c.tc_code`,
      [suiteId],
    );
    return res.rows.map((r) => r.code);
  }

  // One test case by code (tc_code or automation_ref) with its steps and data — what the test runner needs.
  // Not found → null. Steps come sorted by step_order so the caller can run them in sequence directly.
  async findCaseByCode(code) {
    const found = await this.query(
      `SELECT c.test_id FROM test_cases c WHERE ${CODE_EXPR} = $1 LIMIT 1`,
      [code],
    );
    if (!found.rows[0]) return null;
    const { test_id: testId } = found.rows[0];

    const [steps, data] = await Promise.all([
      this.query(
        `SELECT step_order, step_action, step_target, expected_result, field_name
           FROM test_steps WHERE test_id = $1 ORDER BY step_order`,
        [testId],
      ),
      this.query(
        `SELECT field_name, data_value, is_valid
           FROM test_data WHERE test_id = $1 ORDER BY data_id`,
        [testId],
      ),
    ]);

    return {
      test_id: testId,
      steps: steps.rows,
      data: toDataMap(data.rows),
    };
  }

  // The GitHub Actions run plan: many cases with steps + test_data, in 3 fixed queries.
  // Keeps the 'env:VAR_NAME' string in data_value as is — only the runner resolves it, the backend does not
  // (a real password must not travel through a response and end up in a public repo's Actions log).
  async findCasesByCodes(codes) {
    if (!codes || !codes.length) return [];
    const cases = await this.query(
      `SELECT c.test_id, c.tc_code, c.title, ${CODE_EXPR} AS code
         FROM test_cases c
        WHERE ${CODE_EXPR} = ANY($1::text[])
        ORDER BY array_position($1::text[], ${CODE_EXPR})`,
      [codes],
    );
    if (!cases.rows.length) return [];
    const ids = cases.rows.map((r) => r.test_id);

    const [steps, data] = await Promise.all([
      this.query(
        `SELECT test_id, step_order, step_action, step_target, expected_result, field_name
           FROM test_steps WHERE test_id = ANY($1::int[]) ORDER BY test_id, step_order`,
        [ids],
      ),
      this.query(
        `SELECT test_id, field_name, data_value, is_valid
           FROM test_data WHERE test_id = ANY($1::int[]) ORDER BY test_id, data_id`,
        [ids],
      ),
    ]);

    return cases.rows.map((c) => ({
      code: c.code,
      tc_code: c.tc_code,
      title: c.title,
      steps: steps.rows.filter((s) => s.test_id === c.test_id),
      data: toDataMap(data.rows.filter((d) => d.test_id === c.test_id)),
    }));
  }

  // From the tc_code list the user sent, keep only codes that exist and are 'ready',
  // IN THE ORDER THEY WERE SENT (issue #67: a template's target_json.testIds is an ordered list).
  // ORDER BY c.tc_code would silently re-sort them alphabetically.
  async findReadyCodesByTcCodes(tcCodes) {
    const res = await this.query(
      `SELECT ${CODE_EXPR} AS code
         FROM test_cases c
        WHERE c.tc_code = ANY($1::text[]) AND c.test_status = 'ready'
        ORDER BY array_position($1::text[], c.tc_code)`,
      [tcCodes],
    );
    return res.rows.map((r) => r.code);
  }
  //Testcase
  async createCase(data) {
    const result = await this.query(
      `INSERT INTO test_cases
         (spec_id, tc_code, title, preconditions, expected_result, priority, test_type, test_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        data.spec_id,
        data.tc_code,
        data.title,
        data.preconditions ?? null,
        data.expected_result,
        data.priority,
        data.test_type,
        data.test_status ?? "draft",
      ],
    );

    return result.rows[0];
  }

  async findCaseDetails(id) {
    const caseResult = await this.query(
      `SELECT c.*, sp.suite_id, sp.spec_code
       FROM test_cases c
       JOIN test_specs sp ON sp.spec_id = c.spec_id
       WHERE c.test_id = $1
       LIMIT 1`,
      [id],
    );

    const testCase = caseResult.rows[0];

    if (!testCase) {
      return null;
    }

    const [stepsResult, dataResult] = await Promise.all([
      this.query(
        `SELECT * FROM test_steps
         WHERE test_id = $1
         ORDER BY step_order ASC`,
        [id],
      ),
      this.query(
        `SELECT * FROM test_data
         WHERE test_id = $1
         ORDER BY data_id ASC`,
        [id],
      ),
    ]);

    return {
      ...testCase,
      steps: stepsResult.rows,
      test_data: dataResult.rows,
    };
  }
  async findCases(filters = {}) {
    const conditions = [];
    const values = [];

    const addFilter = (column, value) => {
      if (value !== undefined && value !== "") {
        values.push(value);
        conditions.push(`${column} = $${values.length}`);
      }
    };

    addFilter("sp.suite_id", filters.suite);
    addFilter("c.test_type", filters.type);
    addFilter("c.priority", filters.priority);
    if (filters.status !== undefined && filters.status !== "") {
      values.push(filters.status.toUpperCase());
      conditions.push(`UPPER(c.test_status) = $${values.length}`);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const result = await this.query(
      `SELECT c.*, sp.suite_id, sp.spec_code
       FROM test_cases c
       JOIN test_specs sp ON sp.spec_id = c.spec_id
       ${whereClause}
       ORDER BY c.test_id ASC`,
      values,
    );

    return result.rows;
  }
  async updateCase(id, data) {
    const allowedFields = [
      "title",
      "preconditions",
      "expected_result",
      "priority",
      "test_type",
      "test_status",
    ];

    const fields = [];
    const params = [];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        params.push(data[field]);
        fields.push(`${field} = $${params.length}`);
      }
    }

    if (fields.length === 0) return null;

    params.push(id);
    const result = await this.query(
      `UPDATE test_cases SET ${fields.join(", ")}
        WHERE test_id = $${params.length}
       RETURNING *`,
      params,
    );

    return result.rows[0] || null;
  }
  async deleteCase(id) {
    const client = await getPool().connect();

    try {
      await client.query("BEGIN");

      // Lock the test case so no child rows appear between the check and the delete.
      const caseResult = await client.query(
        `SELECT test_id
         FROM test_cases
         WHERE test_id = $1
         FOR UPDATE`,
        [id],
      );

      if (caseResult.rowCount === 0) {
        await client.query("ROLLBACK");
        return null;
      }

      // Check for child rows before deleting.
      const childrenResult = await client.query(
        `SELECT
           EXISTS (
             SELECT 1 FROM test_steps WHERE test_id = $1
           )
           OR EXISTS (
             SELECT 1 FROM test_data WHERE test_id = $1
           )
           OR EXISTS (
             SELECT 1 FROM test_results WHERE test_id = $1
           ) AS has_children`,
        [id],
      );

      if (childrenResult.rows[0].has_children) {
        await client.query("ROLLBACK");
        return { deleted: false, reason: "HAS_CHILDREN" };
      }

      await client.query(
        "DELETE FROM test_cases WHERE test_id = $1",
        [id],
      );

      await client.query("COMMIT");

      return { deleted: true };
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // Keep the original error.
      }

      throw error;
    } finally {
      client.release();
    }
  }
  //Suite
  async findSuites() {
    const r = await this.query(
      `SELECT s.suite_id, s.suite_name,
              COUNT(c.test_id) AS case_count,
              COUNT(c.test_id) FILTER (WHERE c.test_status = 'ready') AS ready_count
         FROM test_suites s
         LEFT JOIN test_specs sp ON sp.suite_id = s.suite_id
         LEFT JOIN test_cases c  ON c.spec_id = sp.spec_id
        GROUP BY s.suite_id, s.suite_name
        ORDER BY s.suite_id`,
    );
    return r.rows;
  }
  async findSuiteById(id) {
    const result = await this.query(
      `SELECT
       s.suite_id,
       s.suite_name,
       s.suite_description,
       s.created_by,
       s.created_at,
       s.updated_by,
       s.updated_at,
       COUNT(c.test_id) AS case_count,
       COUNT(c.test_id) FILTER (
         WHERE c.test_status = 'ready'
       ) AS ready_count
     FROM test_suites s
     LEFT JOIN test_specs sp ON sp.suite_id = s.suite_id
     LEFT JOIN test_cases c ON c.spec_id = sp.spec_id
     WHERE s.suite_id = $1
     GROUP BY s.suite_id`,
      [id],
    );

    return result.rows[0] || null;
  }
  async findSpecsBySuite(suiteId) {
    const r = await this.query(
      `SELECT spec_id, spec_code, suite_id, screen_name
         FROM test_specs WHERE suite_id = $1 ORDER BY spec_code`,
      [suiteId],
    );
    return r.rows;
  }
  async createSpec(data) {
    const result = await this.query(
      `INSERT INTO test_specs
       (spec_code, suite_id, source_reference, screen_name,
        spec_description, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
      [
        data.spec_code,
        data.suite_id,
        data.source_reference ?? null,
        data.screen_name ?? null,
        data.spec_description ?? null,
        data.created_by ?? null,
      ],
    );

    return result.rows[0];
  }
  async createSuite(data) {
    const result = await this.query(
      `INSERT INTO test_suites (suite_name, suite_description)
       VALUES ($1, $2)
       RETURNING *`,
      [
        data.suite_name,
        data.suite_description ?? null,
      ],
    );

    return result.rows[0];
  }

  async updateSuite(id, data) {
    const allowedFields = ["suite_name", "suite_description"];

    const fields = [];
    const params = [];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        params.push(data[field]);
        fields.push(`${field} = $${params.length}`);
      }
    }

    if (fields.length === 0) return null;

    params.push(id);

    const result = await this.query(
      `UPDATE test_suites
       SET ${fields.join(", ")}
       WHERE suite_id = $${params.length}
       RETURNING *`,
      params,
    );

    return result.rows[0] || null;
  }

  async deleteSuite(id) {
    const client = await getPool().connect();

    try {
      await client.query("BEGIN");

      // Lock the Suite so the data cannot change between the check and the delete.
      const suiteResult = await client.query(
        `SELECT suite_id
         FROM test_suites
         WHERE suite_id = $1
         FOR UPDATE`,
        [id],
      );

      if (suiteResult.rowCount === 0) {
        await client.query("ROLLBACK");
        return null;
      }

      // A Suite still referenced by a Specification cannot be deleted.
      const childrenResult = await client.query(
        `SELECT EXISTS (
           SELECT 1
           FROM test_specs
           WHERE suite_id = $1
         ) AS has_children`,
        [id],
      );

      if (childrenResult.rows[0].has_children) {
        await client.query("ROLLBACK");
        return { deleted: false, reason: "HAS_CHILDREN" };
      }

      await client.query(
        `DELETE FROM test_suites
         WHERE suite_id = $1`,
        [id],
      );

      await client.query("COMMIT");

      return { deleted: true };
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // Keep the original error.
      }

      throw error;
    } finally {
      client.release();
    }
  }
  async updateSpec(id, data) {
    const allowedFields = [
      "source_reference",
      "screen_name",
      "spec_description",
      "updated_by",
    ];

    const fields = [];
    const params = [];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        params.push(data[field]);
        fields.push(`${field} = $${params.length}`);
      }
    }

    if (fields.length === 0) return null;

    params.push(id);

    const result = await this.query(
      `UPDATE test_specs
        SET ${fields.join(", ")}
      WHERE spec_id = $${params.length}
      RETURNING *`,
      params,
    );

    return result.rows[0] || null;
  }

  async deleteSpec(id) {
    const result = await this.query(
      `DELETE FROM test_specs
      WHERE spec_id = $1
      RETURNING *`,
      [id],
    );

    return result.rows[0] || null;
  }
  // Count the 'ready' tests a template's target_json would run (used for readyCount).
  async countReadyForTarget(target = {}) {
    const codes =
      target.suiteId != null
        ? await this.findReadyCaseCodes(target.suiteId)
        : await this.findReadyCodesByTcCodes(
          (target.testIds || []).map(String),
        );
    return codes.length;
  }

  // Replace a test case's child rows in ONE transaction (steps or test_data).
  // scopeColumn + scopeValues: delete only the matching rows (e.g. only the field_names that were sent);
  // left empty, it deletes every child row of the case.
  // Case does not exist → null so the service returns 404. Shared by replaceCaseSteps/replaceCaseData.
  async _replaceChildRows(id, table, columns, rows, scope = null) {
    const client = await getPool().connect();

    try {
      await client.query("BEGIN");

      // Check that the test case exists and lock the row inside the transaction.
      const caseResult = await client.query(
        `SELECT test_id
         FROM test_cases
         WHERE test_id = $1
         FOR UPDATE`,
        [id],
      );

      if (caseResult.rowCount === 0) {
        await client.query("ROLLBACK");
        return null;
      }

      if (scope) {
        await client.query(
          `DELETE FROM ${table} WHERE test_id = $1 AND ${scope.column} = ANY($2::text[])`,
          [id, scope.values],
        );
      } else {
        await client.query(`DELETE FROM ${table} WHERE test_id = $1`, [id]);
      }

      const placeholders = columns.map((_, i) => `$${i + 2}`).join(", ");
      const inserted = [];

      // Re-insert in the exact order of the array that was sent.
      for (const values of rows) {
        const result = await client.query(
          `INSERT INTO ${table} (test_id, ${columns.join(", ")})
           VALUES ($1, ${placeholders})
           RETURNING *`,
          [id, ...values],
        );

        inserted.push(result.rows[0]);
      }

      await client.query("COMMIT");
      return inserted;
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // Keep the original error if the rollback fails too.
      }

      throw error;
    } finally {
      client.release();
    }
  }

  // step_order is assigned by the backend from the array index, starting at 0.
  async replaceCaseSteps(id, steps) {
    return this._replaceChildRows(
      id,
      "test_steps",
      ["step_order", "step_action", "step_target", "expected_result", "field_name"],
      steps.map((step, index) => [
        index,
        step.step_action,
        step.step_target ?? null,
        step.expected_result ?? null,
        step.field_name ?? null,
      ]),
    );
  }

  // Replace the data of EXACTLY the fields that were sent; a field not mentioned is left untouched.
  // Deliberately NOT replace-all: TC-08…TC-12 have fields (irn_prefix, role, expected_message…)
  // that the case edit form does not derive from test_steps, so replace-all would wipe them and break
  // the standalone specs under automation/. To drop a field entirely, use deleteCaseDataField.
  // Keeps the 'env:VAR_NAME' string in data_value as is — only the runner resolves it, the backend does not.
  async replaceCaseData(id, data) {
    return this._replaceChildRows(
      id,
      "test_data",
      ["field_name", "data_value", "is_valid"],
      data.map((row) => [
        row.field_name,
        row.data_value ?? null,
        row.is_valid ?? true,
      ]),
      { column: "field_name", values: data.map((row) => row.field_name) },
    );
  }

  // Delete every test_data row of one field. Case does not exist → null (the service returns 404);
  // a field with no rows → 0, and deleting again still returns 0 (idempotent).
  async deleteCaseDataField(id, fieldName) {
    const found = await this.query(
      "SELECT test_id FROM test_cases WHERE test_id = $1",
      [id],
    );
    if (!found.rows[0]) return null;

    const res = await this.query(
      "DELETE FROM test_data WHERE test_id = $1 AND field_name = $2",
      [id, fieldName],
    );
    return res.rowCount;
  }
  async addCaseStep(id, data) {
    const client = await getPool().connect();

    try {
      await client.query("BEGIN");

      const caseResult = await client.query(
        `SELECT test_id
       FROM test_cases
       WHERE test_id = $1
       FOR UPDATE`,
        [id],
      );

      if (caseResult.rowCount === 0) {
        await client.query("ROLLBACK");
        return null;
      }

      const orderResult = await client.query(
        `SELECT COALESCE(MAX(step_order), -1) + 1 AS next_order
       FROM test_steps
       WHERE test_id = $1`,
        [id],
      );

      const result = await client.query(
        `INSERT INTO test_steps
         (test_id, step_order, step_action, step_target, expected_result)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
        [
          id,
          orderResult.rows[0].next_order,
          data.step_action,
          data.step_target ?? null,
          data.expected_result ?? null,
        ],
      );

      await client.query("COMMIT");
      return result.rows[0];
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch { }
      throw error;
    } finally {
      client.release();
    }
  }
  async deleteCaseStep(stepId) {
    const result = await this.query(
      `DELETE FROM test_steps
     WHERE step_id = $1
     RETURNING *`,
      [stepId],
    );

    return result.rows[0] || null;
  }
  async reorderCaseSteps(id, steps) {
    const client = await getPool().connect();

    try {
      await client.query("BEGIN");

      const caseResult = await client.query(
        `SELECT test_id
       FROM test_cases
       WHERE test_id = $1
       FOR UPDATE`,
        [id],
      );

      if (caseResult.rowCount === 0) {
        await client.query("ROLLBACK");
        return null;
      }

      const currentResult = await client.query(
        `SELECT step_id, step_order
       FROM test_steps
       WHERE test_id = $1
       ORDER BY step_order`,
        [id],
      );

      const currentIds = currentResult.rows.map((step) => Number(step.step_id));
      const requestedIds = steps.map((step) => Number(step.step_id));
      const requestedOrders = steps.map((step) => Number(step.step_order));

      // Check that every step is present, with no duplicate ID and no duplicate order.
      if (
        currentIds.length !== requestedIds.length ||
        new Set(requestedIds).size !== requestedIds.length ||
        new Set(requestedOrders).size !== requestedOrders.length ||
        !currentIds.every((stepId) => requestedIds.includes(stepId)) ||
        requestedOrders.some(
          (order) => order < 0 || order >= steps.length,
        )
      ) {
        await client.query("ROLLBACK");
        return false;
      }

      // Shift step_order temporarily to avoid violating UNIQUE(test_id, step_order).
      const maxOrder = Math.max(
        -1,
        ...currentResult.rows.map((step) => Number(step.step_order)),
      );

      const offset = maxOrder + steps.length + 1;

      for (const step of steps) {
        await client.query(
          `UPDATE test_steps
         SET step_order = step_order + $1
         WHERE test_id = $2 AND step_id = $3`,
          [offset, id, step.step_id],
        );
      }

      // Apply the new order.
      for (const step of steps) {
        await client.query(
          `UPDATE test_steps
         SET step_order = $1
         WHERE test_id = $2 AND step_id = $3`,
          [step.step_order, id, step.step_id],
        );
      }

      const result = await client.query(
        `SELECT *
       FROM test_steps
       WHERE test_id = $1
       ORDER BY step_order`,
        [id],
      );

      await client.query("COMMIT");
      return result.rows;
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch { }
      throw error;
    } finally {
      client.release();
    }
  }
  // Edit a case's metadata (including test_status: draft → ready). No matching row → null.
  // tc_code and spec_id are NOT editable: test_runs.config_json stores the test CODE, so after a rename
  // rerunning an old run returns 409 NO_READY_TESTS and the user has no idea why.
  // Delete a test case.
  // Still has steps, test_data or test_results → no delete, returns HAS_CHILDREN.
  // Not found → null.
}

module.exports = CatalogRepository;
module.exports.toDataMap = toDataMap;
module.exports.CODE_EXPR = CODE_EXPR; // ResultRepository writes results using the same test-code expression
