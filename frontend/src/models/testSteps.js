// Hợp đồng giữa form FE và bộ chạy test thật.
// The contract between the FE form and the actual test runner.
//
// Nguồn chuẩn là backend/src/services/runner/steps.js — nơi DUY NHẤT thi hành các bước.
// Sửa bất cứ gì ở đây thì phải soi lại file đó, nếu không form sẽ cho người dùng tạo
// ra những case mà runner từ chối ngay bước đầu.
//
// Mô hình: step = CÁCH thực thi (action + locator), test_data = DỮ LIỆU cụ thể (giá trị).
// Giá trị để FILL và URL để VERIFY đều lấy từ test_data, không nằm trên step.

// ACTIONS trong steps.js. Action ngoài danh sách này làm runner ném
// "action chưa hỗ trợ" -> cả case fail.
export const STEP_ACTIONS = ["NAVIGATE", "FILL", "CLICK", "VERIFY"];

// Tiền tố mà toLocator() hiểu. Không tiền tố -> runner coi là CSS selector.
export const LOCATOR_KINDS = [
  { value: "placeholder", label: "Placeholder" },
  { value: "text", label: "Văn bản" },
  { value: "role", label: "ARIA role" },
  { value: "css", label: "CSS selector" },
];

// NAVIGATE nhận URL cho page.goto(), không phải locator.
export const isLocatorAction = (action) =>
  action === "FILL" || action === "CLICK" || action === "VERIFY";

const PREFIX_RE = /^(placeholder|text|role|css)=([\s\S]*)$/;

export const splitTarget = (target = "") => {
  const m = PREFIX_RE.exec(String(target));
  return m ? { kind: m[1], value: m[2] } : { kind: "css", value: String(target) };
};

export const joinTarget = (kind, value) => `${kind}=${value}`;

// Target có thực sự được khai hay không (bỏ tiền tố ra mới biết: "placeholder=" là rỗng).
export const targetValueOf = (action, target = "") =>
  isLocatorAction(action)
    ? splitTarget(target).value.trim()
    : String(target).trim();

// Chuỗi step_target cuối cùng để lưu. '' = bước này không khai target.
// Phải dựng lại từ kind + value đã trim: trim cả chuỗi "text=  Sign In" chỉ cắt hai đầu,
// khoảng trắng bên trong tiền tố vẫn lọt xuống runner và locator sẽ không khớp.
export function normalizeTarget(action, target = "") {
  const value = targetValueOf(action, target);
  if (!value) return "";
  return isLocatorAction(action) ? joinTarget(splitTarget(target).kind, value) : value;
}

// --- tên field của bước FILL -------------------------------------------------
// test_steps CHƯA có cột field_name, nên runner bóc regex "(field x)" ra từ
// expected_result (steps.js:fieldOf). Toàn bộ việc nhúng/bóc chuỗi đó gói trong 3 hàm
// dưới đây: khi backend thêm cột field_name thì chỉ sửa ở đây, view không phải đụng.
// shortcut: dùng cột văn bản cho người đọc làm dữ liệu cho máy; nâng cấp khi có cột thật.
const FIELD_RE = /\s*\(field\s+([A-Za-z0-9_]+)\)/;

export const parseField = (expected = "") =>
  FIELD_RE.exec(String(expected))?.[1] ?? "";

export const stripField = (expected = "") =>
  String(expected).replace(FIELD_RE, "").trim();

export const embedField = (expected = "", field = "") => {
  const text = stripField(expected);
  if (!field) return text;
  return text ? `${text} (field ${field})` : `(field ${field})`;
};

// --- những gì test_data phải có để case chạy được ---------------------------
// FILL  -> field của nó      (steps.js:fillValueFor ném lỗi nếu thiếu giá trị)
// VERIFY không có target -> expected_url (steps.js:verify ném lỗi nếu thiếu)
export function requiredDataFields(steps = []) {
  const out = [];
  for (const s of steps) {
    const action = String(s.action || "").toUpperCase();
    if (action === "FILL") {
      const field = s.field || parseField(s.expected);
      if (field) out.push(field);
    } else if (action === "VERIFY" && !targetValueOf(action, s.target)) {
      out.push("expected_url");
    }
  }
  return [...new Set(out)];
}

// Mỗi phần tử trả về là một lý do runner sẽ ném lỗi (hoặc đoán bừa) khi chạy case này.
// `level`: 'error' = chắc chắn fail, 'warn' = chạy được nhưng dựa vào phỏng đoán.
export function stepProblems(steps = []) {
  const list = [];

  if (!steps.some((s) => String(s.action || "").trim())) {
    return [{ level: "error", text: "Case chưa có bước nào — runner sẽ fail ngay." }];
  }

  // Đánh số theo chỉ số GỐC, khớp với "#n" trên form; dòng chưa chọn action thì bỏ qua.
  steps.forEach((s, i) => {
    if (!String(s.action || "").trim()) return;
    const at = `Bước #${i + 1}`;
    const action = String(s.action).trim().toUpperCase();

    if (!STEP_ACTIONS.includes(action)) {
      list.push({
        level: "error",
        text: `${at}: runner không hiểu action "${s.action}". Chỉ có ${STEP_ACTIONS.join(", ")}.`,
      });
      return;
    }

    const target = targetValueOf(action, s.target);

    if (action === "NAVIGATE" && !target) {
      list.push({ level: "error", text: `${at}: NAVIGATE cần đường dẫn, ví dụ /login.` });
    }
    if ((action === "FILL" || action === "CLICK") && !target) {
      list.push({ level: "error", text: `${at}: ${action} cần locator để biết tác động vào đâu.` });
    }
    if (action === "FILL" && !(s.field || parseField(s.expected))) {
      // steps.js:fillValueFor đoán 'password' nếu target chứa "password", còn lại 'username'.
      list.push({
        level: "warn",
        text: `${at}: FILL chưa khai field, runner sẽ tự đoán "username" hoặc "password".`,
      });
    }
  });

  return list;
}

// shortcut: chưa có PUT /catalog/cases/:id/data nên test_data phải nhập bằng SQL.
// Xoá hàm này và chỗ gọi nó ngay khi endpoint ghi test_data lên.
// Output của hai hàm dưới đây được người dùng DÁN THẲNG vào psql, nên mọi giá trị nội suy
// phải tự chứng minh là an toàn: test_id là số nguyên dương, field_name chỉ [A-Za-z0-9_].
const safeId = (v) => (Number.isInteger(Number(v)) && Number(v) > 0 ? Number(v) : null);

export function dataInsertSql(testId, fields = []) {
  const id = safeId(testId);
  const safe = fields.filter((f) => /^[A-Za-z0-9_]+$/.test(f));
  if (!id || safe.length === 0) return "";
  const rows = safe.map((f) => `  (${id}, '${f}', 'TODO', true)`).join(",\n");
  return `-- thay 'TODO' bằng giá trị thật, hoặc 'env:TEN_BIEN' cho dữ liệu bí mật.
-- is_valid = false cho dữ liệu sai có chủ ý (case âm).
INSERT INTO test_data (test_id, field_name, data_value, is_valid) VALUES\n${rows};`;
}

// shortcut: chưa có PUT /catalog/cases/:id nên test_status chỉ đặt được lúc tạo case.
// Case đã lưu ở 'draft' thì không còn đường nào qua UI để đưa vào run. Xoá cùng lúc với
// route PUT /catalog/cases/:id.
export const readyUpdateSql = (testId) => {
  const id = safeId(testId);
  return id ? `UPDATE test_cases SET test_status = 'ready' WHERE test_id = ${id};` : "";
};
