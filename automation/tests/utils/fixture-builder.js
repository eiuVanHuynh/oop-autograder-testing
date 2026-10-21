const fs = require("fs");
const os = require("os");
const path = require("path");

const FIXTURES_DIR = path.resolve(__dirname, "../../fixtures");
const TEMPLATE_ROOT = "20211001_NguyenVanA_lab_1";

/**
 * Copy một kịch bản trong fixtures/submissions sang thư mục tạm.
 * Nếu thư mục gốc là tên mẫu, đổi thành <IRN>_<name>_lab_<lab> theo tài khoản test.
 * Kịch bản cố ý sai tên gốc (invalid_root_name) được giữ nguyên.
 * Trả về đường dẫn thư mục gốc, truyền thẳng cho input[type=file].
 */
function buildSubmission(
  scenario,
  { irn = process.env.TEST_STUDENT_IRN, name = "AutoTest", lab = 1 } = {},
) {
  const scenarioDir = path.join(FIXTURES_DIR, "submissions", scenario);
  if (!fs.existsSync(scenarioDir)) {
    throw new Error(`Không tìm thấy kịch bản nộp bài: ${scenario}`);
  }

  const [rootName] = fs.readdirSync(scenarioDir);
  const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), "oop-submission-"));
  const newRoot =
    rootName === TEMPLATE_ROOT ? `${irn}_${name}_lab_${lab}` : rootName;

  const dest = path.join(tmpBase, newRoot);
  fs.cpSync(path.join(scenarioDir, rootName), dest, { recursive: true });
  return dest;
}

/** Xóa thư mục tạm do buildSubmission tạo ra. */
function cleanup(dir) {
  fs.rmSync(path.dirname(dir), { recursive: true, force: true });
}

module.exports = { buildSubmission, cleanup };
