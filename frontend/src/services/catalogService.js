import API from "../models/api";
import { parseField, stripField, normalizeTarget } from "../models/testSteps";

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
        const column = s.fieldName ?? s.field_name ?? "";
        // Cột field_name là nguồn chuẩn. Dòng cũ (trước migration 011) vẫn còn "(field x)"
        // nhúng trong expected_result, nên chỉ bóc khi cột trống — và chỉ cho FILL.
        const isFill = action === "FILL";
        const legacy = isFill && !column ? parseField(expected) : "";
        return {
          order: s.stepOrder ?? s.step_order,
          action,
          target: s.stepTarget ?? s.step_target ?? "",
          expected: legacy ? stripField(expected) : expected,
          field: isFill ? column || legacy : "",
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
      const expected = (s.expected ?? "").trim();
      // field_name chỉ có nghĩa với FILL; gửi ở bước khác chỉ làm bẩn cột.
      const field = action === "FILL" ? (s.field ?? "").trim() : "";
      const target = normalizeTarget(action, s.target);
      return {
        step_action: action,
        ...(target ? { step_target: target } : {}),
        ...(expected ? { expected_result: expected } : {}),
        ...(field ? { field_name: field } : {}),
      };
    });
  // Backend tự hạ case 'ready' về 'draft' nếu bộ steps mới không chạy được, và nói lý do.
  const res = unwrap(await API.put(`/catalog/cases/${id}/steps`, { steps: body }));
  return res?.demotedReason ?? "";
};

// PUT /catalog/cases/:id – sửa metadata. spec_id và tc_code BỊ LOẠI ở schema backend
// (mã test là bất biến sau khi tạo), nên chỉ gửi những trường thật sự đổi được.
// Đặt test_status='ready' mà case chưa chạy được -> 409 NOT_RUNNABLE.
export const updateCase = async (id, c) => {
  const body = {
    title: c.title.trim(),
    expected_result: c.expectedResult.trim(),
    preconditions: c.preconditions?.trim() || null,
    priority: c.priority,
    test_type: c.type,
    test_status: c.status,
  };
  return toCase(unwrap(await API.put(`/catalog/cases/${id}`, body)));
};

// Không có DELETE /catalog/cases/:id: "bỏ" một case = đưa về deprecated.
export const deprecateCase = async (id) =>
  toCase(unwrap(await API.put(`/catalog/cases/${id}`, { test_status: "deprecated" })));

// PUT /catalog/cases/:id/data – thay toàn bộ test_data của case (mảng rỗng = xoá hết).
// Gửi hai dòng cùng field_name là 400, nên lọc trùng ngay ở đây.
export const saveCaseData = async (id, data) => {
  const byField = new Map();
  for (const d of data) {
    const field = d.field?.trim();
    // Dòng chưa có giá trị thì KHÔNG ghi: ghi vào là case trông như đã đủ test_data
    // (_assertRunnable chỉ xét có mặt hay không) rồi fail lúc chạy thật.
    if (field && d.value) byField.set(field, { field_name: field, data_value: d.value, is_valid: d.isValid !== false });
  }
  const res = unwrap(await API.put(`/catalog/cases/${id}/data`, { data: [...byField.values()] }));
  return res?.demotedReason ?? "";
};
