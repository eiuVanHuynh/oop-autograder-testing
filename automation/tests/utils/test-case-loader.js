const { query } = require("./db-client");

async function loadTestCase(tcCode) {
  const testCaseRows = await query(
    `
      SELECT *
      FROM Test_Cases
      WHERE tc_code = ?
    `,
    [tcCode],
  );

  const stepRows = await query(
    `
      SELECT ts.*
      FROM Test_Steps ts
      JOIN Test_Cases tc
        ON ts.test_id = tc.test_id
      WHERE tc.tc_code = ?
      ORDER BY ts.step_order
    `,
    [tcCode],
  );

  const dataRows = await query(
    `
      SELECT
        td.field_name,
        td.\`value\`
      FROM Test_Data td
      JOIN Test_Cases tc
        ON td.test_id = tc.test_id
      WHERE tc.tc_code = ?
    `,
    [tcCode],
  );

  if (stepRows.length === 0) {
    throw new Error(`Test case ${tcCode} has no Test_Steps.`);
  }

  if (dataRows.length === 0) {
    throw new Error(`Test case ${tcCode} has no Test_Data.`);
  }

  return {
    testCase: testCaseRows[0],
    steps: stepRows,
    data: dataRows,

    getData(field) {
      const row = dataRows.find((i) => i.field_name === field);
      if (!row)
        throw new Error(
          `Thieu field "${field}" trong Test_Data cua ${tcCode}.`,
        );
      const value = row.value;
      if (typeof value === "string" && value.startsWith("env:")) {
        const key = value.slice(4);
        if (!process.env[key])
          throw new Error(`Thieu bien moi truong ${key} (${tcCode}.${field}).`);
        return process.env[key];
      }
      return value;
    },

    getStep(n) {
      const step = stepRows.find((item) => item.step_order === n);

      return step;
    },
  };
}

module.exports = {
  loadTestCase,
};
