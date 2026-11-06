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

// Các dòng test_data của MỘT case → map field_name → data_value cho bộ chạy test.
// Hai dòng cùng field_name KHÔNG còn im lặng đè nhau theo thứ tự data_id: dòng
// is_valid = false thắng, vì một giá trị bị đánh dấu là sai chỉ tồn tại để case âm nhập nó.
// Trong cùng một nhóm thì dòng đầu (data_id nhỏ nhất) thắng.
//
// shortcut: đây là luật dọn dẹp cho dữ liệu trùng đã có sẵn trong DB, KHÔNG phải tính năng
// "một luồng nhiều bộ dữ liệu" — chạy một luồng hai lần (bộ đúng và bộ sai) cần cột
// test_data.variant + nhãn bộ dữ liệu trong test_results để trang báo cáo phân biệt được
// hai dòng cùng tc_code. Làm khi FE sẵn sàng hiện nhãn đó. Cửa API (PUT .../data) đã chặn
// tạo thêm dòng trùng, nên luật này chỉ còn áp cho dữ liệu seed/psql cũ.
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

  // Một test case theo mã (tc_code hoặc automation_ref) kèm bước và dữ liệu — bộ chạy test cần.
  // Không tìm thấy → null. Bước đã sắp theo step_order nên nơi gọi chạy tuần tự được luôn.
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

  // Kế hoạch chạy của GitHub Actions: nhiều case kèm steps + test_data, 3 truy vấn cố định.
  // Giữ nguyên chuỗi 'env:TEN_BIEN' trong data_value — nơi chạy test tự giải, backend không giải
  // (mật khẩu thật không được đi qua response rồi lọt vào log Actions của repo public).
  async findCasesByCodes(codes) {
    if (!codes || !codes.length) return [];
    const cases = await this.query(
      `SELECT c.test_id, c.tc_code, c.title, ${CODE_EXPR} AS code
         FROM test_cases c
        WHERE ${CODE_EXPR} = ANY($1::text[])
        ORDER BY c.tc_code`,
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

      // Khóa testcase để tránh phát sinh dữ liệu con trong lúc kiểm tra và xóa.
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

      // Kiểm tra dữ liệu con trước khi xóa.
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
        // Giữ nguyên lỗi ban đầu.
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

      // Khóa Suite để tránh thay đổi dữ liệu trong lúc kiểm tra và xóa.
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

      // Suite đang được Specification tham chiếu thì không cho xóa.
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
        // Giữ nguyên lỗi ban đầu.
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

  // Thay dòng con của một test case trong MỘT transaction (steps hoặc test_data).
  // scopeColumn + scopeValues: chỉ xoá những dòng khớp (vd chỉ các field_name được gửi lên);
  // bỏ trống thì xoá hết dòng con của case.
  // Case không tồn tại → null để service trả 404. Dùng chung cho replaceCaseSteps/replaceCaseData.
  async _replaceChildRows(id, table, columns, rows, scope = null) {
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

      // Thêm lại theo đúng thứ tự mảng gửi lên.
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
        // Giữ nguyên lỗi ban đầu nếu rollback cũng thất bại.
      }

      throw error;
    } finally {
      client.release();
    }
  }

  // step_order do backend gán theo chỉ số mảng, bắt đầu từ 0.
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

  // Thay dữ liệu của ĐÚNG những field được gửi lên; field không nhắc tới thì không bị chạm.
  // Cố ý KHÔNG replace-all: TC-08…TC-12 có những field (irn_prefix, role, expected_message…)
  // mà form sửa case không sinh ra từ test_steps, replace-all sẽ xoá sạch chúng và làm các
  // spec riêng bên automation/ chết. Xoá hẳn một field thì dùng deleteCaseDataField.
  // Giữ nguyên chuỗi 'env:TEN_BIEN' trong data_value — chỉ nơi chạy test giải, backend không.
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

  // Xoá mọi dòng test_data của một field. Case không tồn tại → null (service trả 404);
  // field không có dòng nào → 0, xoá lại lần nữa vẫn 0 (idempotent).
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

      // Kiểm tra đầy đủ step, không trùng ID và không trùng thứ tự.
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

      // Chuyển tạm step_order để tránh vi phạm UNIQUE(test_id, step_order).
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

      // Cập nhật thứ tự mới.
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
  // Sửa metadata của case (gồm test_status: draft → ready). Không có dòng nào khớp → null.
  // tc_code và spec_id KHÔNG sửa được: test_runs.config_json lưu MÃ test, đổi mã xong thì
  // Rerun một run cũ trả 409 NO_READY_TESTS mà người dùng không hiểu vì sao.
  // Xóa test case.
  // Còn steps, test_data hoặc test_results → không xóa, trả HAS_CHILDREN.
  // Không tìm thấy → null.
}

module.exports = CatalogRepository;
module.exports.toDataMap = toDataMap;
module.exports.CODE_EXPR = CODE_EXPR; // ResultRepository ghi kết quả theo cùng biểu thức mã test
