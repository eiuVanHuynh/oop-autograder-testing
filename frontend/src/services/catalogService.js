import API from "../models/api";
import { embedField, parseField, stripField, normalizeTarget } from "../models/testSteps";

const unwrap = (r) => r?.data?.data ?? r?.data ?? r;
const rows = (p) => (Array.isArray(p) ? p : Array.isArray(p?.data) ? p.data : []);

// API (camelCase, testStatus viết HOA) -> object cho giao diện
export const toCase = (r = {}) => ({
  ...r,
  id: r.testId ?? r.test_id ?? r.id,
  code: r.tcCode ?? r.tc_code ?? "",
  title: r.title ?? "",
  specId: r.specId ?? r.spec_id,
  specCode: r.specCode ?? r.spec_code ?? "",
  suiteId: r.suiteId ?? r.suite_id ?? null,
  expectedResult: r.expectedResult ?? r.expected_result ?? "",
  preconditions: r.preconditions ?? "",
  priority: String(r.priority ?? "medium").toLowerCase(),
  type: String(r.testType ?? r.test_type ?? "functional").toLowerCase(),
  status: String(r.testStatus ?? r.test_status ?? "draft").toLowerCase(),
  steps: Array.isArray(r.steps)
    ? r.steps.map((s) => {
        const action = String(s.stepAction ?? s.step_action ?? "").toUpperCase();
        const expected = s.expectedResult ?? s.expected_result ?? "";
        // CHỈ bước FILL mới bóc "(field x)" ra. Bóc ở bước khác thì runner không dùng field đó,
        // mà lưu lại sẽ làm mất đoạn chữ đó khỏi expected_result.
        const isFill = action === "FILL";
        return {
          order: s.stepOrder ?? s.step_order,
          action,
          target: s.stepTarget ?? s.step_target ?? "",
          expected: isFill ? stripField(expected) : expected,
          field: isFill ? parseField(expected) : "",
        };
      })
    : [],
  // GET /catalog/cases/:id trả kèm testData; danh sách case thì không.
  // Đây là DỮ LIỆU cụ thể của case: giá trị cho FILL, expected_url cho VERIFY.
  testData: Array.isArray(r.testData)
    ? r.testData.map((d) => ({
        field: d.fieldName ?? d.field_name ?? "",
        value: d.dataValue ?? d.data_value ?? "",
        isValid: d.isValid ?? d.is_valid ?? true,
      }))
    : [],
});

export const toSuite = (r = {}) => ({
  id: r.suiteId ?? r.suite_id ?? r.id,
  name: r.suiteName ?? r.suite_name ?? `Suite #${r.suiteId ?? r.id}`,
  caseCount: Number(r.caseCount ?? r.case_count ?? 0),
  readyCount: Number(r.readyCount ?? r.ready_count ?? 0),
});

export const toSpec = (r = {}) => ({
  id: r.specId ?? r.spec_id ?? r.id,
  code: r.specCode ?? r.spec_code ?? "",
  screen: r.screenName ?? r.screen_name ?? "",
});

// object giao diện -> body POST /catalog/cases (schema .strict(): đừng gửi trường thừa)
const toBody = (c) => ({
  spec_id: Number(c.specId),
  tc_code: c.code.trim(),
  title: c.title.trim(),
  expected_result: c.expectedResult.trim(),
  ...(c.preconditions?.trim() ? { preconditions: c.preconditions.trim() } : {}),
  priority: c.priority,
  test_type: c.type,
  test_status: c.status,
});

export const listSuites = async () => rows(unwrap(await API.get("/catalog/suites"))).map(toSuite);
export const listSpecs = async (suiteId) =>
  rows(unwrap(await API.get(`/catalog/suites/${suiteId}/specs`))).map(toSpec);
export const listCases = async (params = {}) =>
  rows(unwrap(await API.get("/catalog/cases", { params }))).map(toCase);
export const getCase = async (id) => toCase(unwrap(await API.get(`/catalog/cases/${id}`)));

export const createCase = async (c) => toCase(unwrap(await API.post("/catalog/cases", toBody(c))));

// PUT /catalog/cases/:id/steps – thay toàn bộ steps (bỏ dòng trống).
// Mảng rỗng là hợp lệ: đó là cách xoá hết bước. step_order do backend gán theo chỉ số mảng.
export const saveSteps = async (id, steps) => {
  const body = steps
    .filter((s) => s.action?.trim())
    .map((s) => {
      const action = s.action.trim().toUpperCase();
      // Chỉ bước FILL mới nhúng field; nhúng vào bước khác thì runner không đọc, chỉ làm rác chữ.
      const expected = embedField(s.expected ?? "", action === "FILL" ? s.field : "");
      const target = normalizeTarget(action, s.target);
      return {
        step_action: action,
        ...(target ? { step_target: target } : {}),
        ...(expected ? { expected_result: expected } : {}),
      };
    });
  await API.put(`/catalog/cases/${id}/steps`, { steps: body });
};

// BACKEND-TODO: PUT/DELETE /catalog/cases/:id là 🟡 ở api-endpoints.md mục 9 và backend CHƯA khai
// route trong catalog.routes.js. Vì vậy ở đây không có updateCase — sửa một case hiện chỉ thay
// được steps (PUT /catalog/cases/:id/steps). Thêm lại khi route PUT có thật.
// deleteCase cũng chờ route DELETE; nút gọi nó đang tắt sau cờ CASE_RETIRE_READY ở TestCases.jsx.
export const deleteCase = async (id) => {
  await API.delete(`/catalog/cases/${id}`);
};
