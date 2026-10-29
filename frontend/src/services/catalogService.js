import API from "../models/api";

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
    ? r.steps.map((s) => ({
        order: s.stepOrder ?? s.step_order,
        action: s.stepAction ?? s.step_action ?? "",
        target: s.stepTarget ?? s.step_target ?? "",
        expected: s.expectedResult ?? s.expected_result ?? "",
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

// PUT /catalog/cases/:id/steps – thay toàn bộ steps (bỏ dòng trống)
export const saveSteps = async (id, steps) => {
  const body = steps
    .filter((s) => s.action.trim())
    .map((s) => ({
      step_action: s.action.trim(),
      ...(s.target?.trim() ? { step_target: s.target.trim() } : {}),
      ...(s.expected?.trim() ? { expected_result: s.expected.trim() } : {}),
    }));
  await API.put(`/catalog/cases/${id}/steps`, { steps: body });
};