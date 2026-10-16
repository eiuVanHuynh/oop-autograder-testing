// X1/X2: dua du lieu TC-08 trong DB ve quy tac docs/test-data-rules.md.
// Tu nhan biet ten bang/cot (test_data.data_value hay Test_Data.value), nen chay duoc voi ca hai kieu schema.
//   npm run data:apply            -> ap dung
//   npm run data:apply -- --dry-run -> chi in ra, khong ghi
const { query, closeDb } = require("../tests/utils/db-client");

const DRY = process.argv.includes("--dry-run");

const TARGET = {
  "TC-08": {
    irn_prefix: "2099",
    full_name_prefix: "AUTOTEST Tran Thi B",
    email_prefix: "autotest.",
  },
};

async function findName(table, column) {
  const rows = await query(
    `SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = ? ${column ? "AND COLUMN_NAME IN (?, ?)" : ""}`,
    column ? [table, ...column] : [table],
  );
  return rows;
}

async function main() {
  const dataCols = await findName("test_data", ["data_value", "value"]);
  const caseCols = await findName("test_cases", null);
  if (!dataCols.length || !caseCols.length) {
    throw new Error("Khong thay bang test_data / test_cases trong database dang ket noi (kiem tra DB_NAME).");
  }
  const dataTable = dataCols[0].TABLE_NAME;
  const valueCol = dataCols[0].COLUMN_NAME;
  const caseTable = caseCols[0].TABLE_NAME;
  console.log(`Schema: ${dataTable}.${valueCol}, ${caseTable}${DRY ? "  [DRY-RUN]" : ""}`);

  let missing = 0;
  let changed = 0;
  for (const [tc, fields] of Object.entries(TARGET)) {
    for (const [field, wanted] of Object.entries(fields)) {
      const rows = await query(
        `SELECT td.\`${valueCol}\` AS v FROM \`${dataTable}\` td
         JOIN \`${caseTable}\` tc ON td.test_id = tc.test_id
         WHERE tc.tc_code = ? AND td.field_name = ?`,
        [tc, field],
      );
      if (!rows.length) {
        console.log(`  ! ${tc}.${field}: THIEU trong DB (chua seed migration 002?)`);
        missing++;
        continue;
      }
      if (rows[0].v === wanted) {
        console.log(`  = ${tc}.${field}: da dung (${wanted})`);
        continue;
      }
      console.log(`  ~ ${tc}.${field}: "${rows[0].v}" -> "${wanted}"`);
      changed++;
      if (!DRY) {
        await query(
          `UPDATE \`${dataTable}\` td JOIN \`${caseTable}\` tc ON td.test_id = tc.test_id
           SET td.\`${valueCol}\` = ? WHERE tc.tc_code = ? AND td.field_name = ?`,
          [wanted, tc, field],
        );
      }
    }
  }
  console.log(`Xong: ${changed} gia tri ${DRY ? "se doi" : "da doi"}, ${missing} thieu.`);
  process.exitCode = missing ? 1 : 0;
}

main()
  .catch((e) => {
    console.error("LOI:", e.message);
    process.exitCode = 1;
  })
  .finally(closeDb);
