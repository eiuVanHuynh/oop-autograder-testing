// Tu kiem tra X1-X3:  npm run check:x1x3
// Chi doc file (va DB neu co DB_USER). Khong goi mang, khong ghi gi.
require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});

const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "../..");
const rd = (p) => {
  try {
    return fs.readFileSync(path.join(root, p), "utf8");
  } catch {
    return null;
  }
};

let fail = 0;
let pending = 0;
const ok = (m) => console.log(`  [OK]   ${m}`);
const bad = (m) => {
  fail++;
  console.log(`  [LOI]  ${m}`);
};
const todo = (m) => {
  pending++;
  console.log(`  [CHO]  ${m}`);
};
const check = (cond, m) => (cond ? ok(m) : bad(m));

async function main() {
  console.log("X1 - Quy tac du lieu test");
  const rules = rd("docs/test-data-rules.md");
  check(rules && rules.includes("AUTOTEST"), "docs/test-data-rules.md co quy tac tien to AUTOTEST");
  const env = rd(".env.example") || "";
  for (const k of ["TEST_DATA_PREFIX", "TEST_IRN_PREFIX", "TEST_EMAIL_DOMAIN", "TEST_GOOGLE_EIU_EMAIL", "TEST_GOOGLE_OUTSIDE_EMAIL"]) {
    check(new RegExp(`^${k}=`, "m").test(env), `.env.example co bien ${k}`);
  }
  check(/^BASE_URL=https:\/\/oop-autograder-test\.vercel\.app\s*$/m.test(env), ".env.example: BASE_URL tro toi moi truong test");
  const leaked = /^\s*TEST_[A-Z0-9_]*PASSWORD\s*=\s*(?!your|example|changeme|\s*$)\S+/im.test(env) && /123456/.test(env);
  check(!leaked, ".env.example khong chua mat khau that");

  console.log("\nX2 - Tai khoan va du lieu user");
  const td = require("../tests/utils/test-data.js");
  const run = td.newRunId();
  const irn = td.uniqueIrn(run);
  check(/^2099\d{6}$/.test(irn), `uniqueIrn -> ${irn} (10 chu so, dau 2099)`);
  check(/^AUTOTEST_Lab_\d{6}$/.test(td.autotestLab(run)) && /^autotest\.\d{6}@eiu\.edu\.vn$/.test(td.autotestEmail(run)), "ten Lab / email theo quy tac");
  for (const f of ["student_list_batch1.csv", "student_list_duplicate.csv", "student_list_invalid_rows.csv", "student_list_empty.csv", "student_list_wrong_format.txt"]) {
    check(rd(`automation/fixtures/${f}`) !== null, `fixtures/${f} (TC-09)`);
  }
  check(rd("db/migrations/005_autotest_data_rules.sql") !== null, "migration 005 (du lieu TC-08 theo quy tac)");
  check(/newRunId\(\)/.test(rd("automation/tests/auth/auth.spec.js") || ""), "auth.spec.js TC-08 dung newRunId() de sinh IRN duy nhat");
  check(/TEST_(STUDENT|LECTURER)_IRN=/.test(env), ".env.example co TEST_STUDENT_IRN / TEST_LECTURER_IRN (gia tri that dat trong .env)");

  if (process.env.DB_USER) {
    try {
      const { query, closeDb } = require("../tests/utils/db-client");
      const cols = await query(
        "SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME)='test_data' AND COLUMN_NAME IN ('data_value','value')",
      );
      const cs = await query("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME)='test_cases'");
      if (cols.length && cs.length) {
        const rows = await query(
          `SELECT td.field_name f, td.\`${cols[0].COLUMN_NAME}\` v FROM \`${cols[0].TABLE_NAME}\` td JOIN \`${cs[0].TABLE_NAME}\` tc ON td.test_id=tc.test_id WHERE tc.tc_code='TC-08'`,
        );
        const v = Object.fromEntries(rows.map((r) => [r.f, r.v]));
        check(v.irn_prefix === "2099" && v.email_prefix === "autotest." && /^AUTOTEST /.test(v.full_name_prefix || ""), "DB: du lieu TC-08 da theo quy tac (neu chua: npm run data:apply)");
      } else bad("DB: khong thay bang test_data / test_cases");
      await closeDb();
    } catch (e) {
      bad(`DB: khong ket noi duoc (${e.code || e.message})`);
    }
  } else {
    todo("DB: bo qua (chua co DB_USER). Dat bien DB_* roi chay lai de kiem tra du lieu TC-08");
  }

  console.log("\nX3 - Bien ban thu cong");
  for (const tc of ["TC-03", "TC-04", "TC-05", "TC-07"]) {
    const t = rd(`docs/manual-tests/${tc}.md`);
    if (!t) {
      bad(`${tc}: thieu file docs/manual-tests/${tc}.md`);
      continue;
    }
    const line = (t.match(/^- Trạng thái:.*$/m) || [""])[0];
    const done = /\[x\]\s*(Pass|Fail|\*\*Blocked\*\*|Blocked)/i.test(line);
    if (done) ok(`${tc}: ${line.replace(/^- Trạng thái:\s*/, "").slice(0, 90)}`);
    else todo(`${tc}: co bien ban, chua co ket qua (thuc hien tay roi tick Pass/Fail/Blocked)`);
  }

  console.log(`\nKet qua: ${fail} loi, ${pending} muc cho (thu cong / DB).`);
  process.exitCode = fail ? 1 : 0;
}
main();
