const BaseRepository = require("./BaseRepository");
const { getPool } = require("../config/db");
// Đọc test_suites / test_specs / test_cases – nơi khai báo test.
// Reads test_suites / test_specs / test_cases – where tests are declared.
//
// Chỉ lấy test_status = 'ready'. Ưu tiên automation_ref nếu có, không thì dùng tc_code.
// Giả định cột (db/schema): test_cases(spec_id, tc_code, automation_ref, test_status),
// test_specs(spec_id, suite_id). Nếu schema thật đặt tên khác, sửa 2 câu SQL dưới đây.
// Phần ghi (CRUD suite/spec/case) là 🟡, làm sau.
const CODE_EXPR = "COALESCE(NULLIF(c.automation_ref, ''), c.tc_code)";

class CatalogRepository extends BaseRepository {
  constructor() {
    super("test_suites", "suite_id");
  }

  // Mã test 'ready' của một suite, dùng để sinh --grep.
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

  // Trong danh sách tc_code người dùng gửi lên, chỉ giữ mã có thật và đang 'ready'.
  async findReadyCodesByTcCodes(tcCodes) {
    const res = await this.query(
      `SELECT ${CODE_EXPR} AS code
         FROM test_cases c
        WHERE c.tc_code = ANY($1::text[]) AND c.test_status = 'ready'
        ORDER BY c.tc_code`,
      [tcCodes],
    );
    return res.rows.map((r) => r.code);
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
      `SELECT *
       FROM test_cases
       WHERE test_id = $1
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

  async findSpecsBySuite(suiteId) {
    const r = await this.query(
      `SELECT spec_id, spec_code, suite_id, screen_name
         FROM test_specs WHERE suite_id = $1 ORDER BY spec_code`,
      [suiteId],
    );
    return r.rows;
  }

  // Đếm test 'ready' mà một target_json của template sẽ chạy (dùng cho readyCount).
  async countReadyForTarget(target = {}) {
    const codes =
      target.suiteId != null
        ? await this.findReadyCaseCodes(target.suiteId)
        : await this.findReadyCodesByTcCodes(
            (target.testIds || []).map(String),
          );
    return codes.length;
  }

  async replaceCaseSteps(id, steps) {
    const client = await getPool().connect();

    try {
      await client.query("BEGIN");

      // Kiểm tra test case có tồn tại và khóa dòng trong transaction.
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

      // Xóa toàn bộ steps hiện tại của test case.
      await client.query("DELETE FROM test_steps WHERE test_id = $1", [id]);

      // Thêm lại theo thứ tự của mảng gửi lên, bắt đầu từ 0.
      const insertedSteps = [];

      for (let index = 0; index < steps.length; index++) {
        const step = steps[index];

        const result = await client.query(
          `INSERT INTO test_steps
             (test_id, step_order, step_action, step_target, expected_result)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [
            id,
            index,
            step.step_action,
            step.step_target ?? null,
            step.expected_result ?? null,
          ],
        );

        insertedSteps.push(result.rows[0]);
      }

      await client.query("COMMIT");
      return insertedSteps;
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // Giữ nguyên lỗi ban đầu nếu rollback cũng thất bại.
      }

      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = CatalogRepository;
