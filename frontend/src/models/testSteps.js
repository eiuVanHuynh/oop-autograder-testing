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
// test_steps CÓ cột field_name (migration 011) và đó là nguồn chuẩn. Hai hàm dưới đây chỉ
// còn để đọc dòng CŨ, nơi field còn nhúng dạng "(field x)" trong expected_result —
// đúng nhánh dự phòng mà runner giữ ở steps.js:fieldOf. Không ghi kiểu đó nữa.
const FIELD_RE = /\s*\(field\s+([A-Za-z0-9_]+)\)/;

export const parseField = (expected = "") =>
  FIELD_RE.exec(String(expected))?.[1] ?? "";

export const stripField = (expected = "") =>
  String(expected).replace(FIELD_RE, "").trim();

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
