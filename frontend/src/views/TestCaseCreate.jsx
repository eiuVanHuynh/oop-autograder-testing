// Trang Tạo Test Case (/testcases/new) – thay modal "Create" cũ trong TestCases.jsx.
// Create Test Case page – replaces the old "Create" modal.
//
// Thiết kế lại để dễ dùng:
//  - Một trang, 3 phần đánh số theo đúng thứ tự làm: 1 Thông tin -> 2 Các bước -> 3 Dữ liệu.
//  - Cột phải cố định: danh sách "đã đủ chưa" + nút Lưu. Không còn ô Status để đoán:
//      "Save as draft"        = lưu nháp, chỉ cần phần 1.
//      "Save & mark ready"    = lưu và cho phép chạy, chỉ bấm được khi mọi mục đều xanh.
//  - Mỗi bước (step) có 4 nút chọn việc cần làm bằng chữ thường, kèm một câu mô tả tự sinh
//    ("Type data "username" into the input with placeholder “Email”").
//  - Phần Dữ liệu tự liệt kê field mà các bước đang cần, không phải tự nhớ.
//
// Hợp đồng với backend KHÔNG đổi: vẫn POST /catalog/cases (draft) -> PUT steps -> PUT data
// -> PUT /catalog/cases/:id đặt 'ready' (thứ tự bắt buộc, xem handleSave ở TestCases.jsx cũ).
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowDown, ArrowUp, CheckCircle2, Circle, Copy, Plus, Trash2, X,
} from "lucide-react";
import toast from "react-hot-toast";
import { CASE_TYPES, CASE_PRIORITIES } from "../models/options";
import {
  LOCATOR_KINDS, isLocatorAction, splitTarget, joinTarget,
  requiredDataFields, stepProblems,
} from "../models/testSteps";
import {
  listSuites, listSpecs, listCases, createCase, updateCase, saveSteps, saveCaseData,
} from "../services/catalogService";
import { getErrorMessage } from "../services/authService";
import PageHeader from "../components/ui/PageHeader";

const inputCls =
  "w-full h-10 px-3 bg-white border border-gray-300 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50 disabled:text-gray-400";
const areaCls = inputCls.replace("h-10 ", "py-2 ");
const CODE_MAX = 30; // test_cases.tc_code VARCHAR(30)

// Nhãn thân thiện cho 4 action mà bộ chạy test thật sự hiểu (models/testSteps.js).
const ACTIONS = [
  { value: "NAVIGATE", label: "Go to page", hint: "Open a path, e.g. /login" },
  { value: "FILL", label: "Type text", hint: "Type a value into an input" },
  { value: "CLICK", label: "Click", hint: "Click a button or link" },
  { value: "VERIFY", label: "Check", hint: "Check an element is visible, or check the current URL" },
];

const LOCATOR_LABEL = { placeholder: "Placeholder", text: "Visible text", role: "ARIA role", css: "CSS selector" };
const LOCATOR_HELP = {
  placeholder: "The hint text inside the input, e.g. Email",
  text: "Text shown on screen, e.g. Sign In",
  role: "ARIA role, e.g. button",
  css: "CSS selector, e.g. #submit",
};

let uid = 0;
const newStep = (patch = {}) => ({ key: ++uid, action: "", target: "", expected: "", field: "", ...patch });

// Mẫu bước dựng sẵn: chỉ là khung, người dùng điền locator cho đúng giao diện của mình.
const LOGIN_TEMPLATE = () => [
  newStep({ action: "NAVIGATE", target: "/login" }),
  newStep({ action: "FILL", target: "placeholder=", field: "username" }),
  newStep({ action: "FILL", target: "placeholder=", field: "password" }),
  newStep({ action: "CLICK", target: "text=" }),
  newStep({ action: "VERIFY", target: "" }),
];

const EMPTY = {
  suiteId: "", specId: "", code: "", title: "", type: "functional", priority: "medium",
  preconditions: "", expectedResult: "",
};

// Câu mô tả bước bằng lời, sinh từ chính dữ liệu form.
function locatorText(target) {
  const { kind, value } = splitTarget(target);
  const v = value.trim() || "…";
  if (kind === "placeholder") return `the input with placeholder “${v}”`;
  if (kind === "text") return `the element showing “${v}”`;
  if (kind === "role") return `the ${v} (ARIA role)`;
  return `the element ${v}`;
}
function describeStep(s) {
  const a = s.action;
  if (a === "NAVIGATE") return `Open ${s.target.trim() || "…"}`;
  if (a === "FILL") return `Type data “${s.field?.trim() || "?"}” into ${locatorText(s.target)}`;
  if (a === "CLICK") return `Click ${locatorText(s.target)}`;
  if (a === "VERIFY") {
    return splitTarget(s.target).value.trim()
      ? `Check that ${locatorText(s.target)} is visible`
      : "Check that the page URL equals data “expected_url”";
  }
  return "";
}

// Lỗi/cảnh báo của MỘT bước, bằng tiếng Anh cho khớp giao diện. Cùng luật với stepProblems()
// trong models/testSteps.js (nguồn chuẩn, dùng để đếm lỗi); sửa luật ở đó thì sửa cả ở đây.
function explain(s) {
  const out = [];
  const val = isLocatorAction(s.action) ? splitTarget(s.target).value.trim() : s.target.trim();
  if (s.action === "NAVIGATE" && !val) out.push({ level: "error", text: "Enter a path, e.g. /login." });
  if ((s.action === "FILL" || s.action === "CLICK") && !val)
    out.push({ level: "error", text: "Tell the runner which element to use." });
  if (s.action === "FILL" && !s.field?.trim())
    out.push({ level: "warn", text: "No data field set — the runner will guess “username” or “password”." });
  return out;
}

function Section({ n, title, hint, done, children }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white">
      <header className="flex items-start gap-3 border-b border-gray-100 px-5 py-4">
        <span
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
            done ? "bg-green-100 text-green-700" : "bg-brand-100 text-brand-700"
          }`}
        >
          {done ? <CheckCircle2 size={14} /> : n}
        </span>
        <div className="min-w-0">
          <h2 className="m-0 text-base font-semibold text-gray-900">{title}</h2>
          {hint && <p className="m-0 mt-0.5 text-xs text-gray-500">{hint}</p>}
        </div>
      </header>
      <div className="space-y-4 p-5">{children}</div>
    </section>
  );
}

function Field({ label, required, hint, error, children, className = "" }) {
  return (
    <div className={className}>
      <label className="mb-1 block text-sm font-medium text-gray-800">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      ) : (
        hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>
      )}
    </div>
  );
}

export default function TestCaseCreate() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [steps, setSteps] = useState(() => [newStep()]);
  const [testData, setTestData] = useState([]); // [{ field, value, isValid }]
  const [suites, setSuites] = useState([]);
  const [specs, setSpecs] = useState([]);
  const [existing, setExisting] = useState([]); // mã đã dùng, để báo trùng ngay khi gõ
  const [touched, setTouched] = useState(false); // chỉ hiện lỗi đỏ sau lần bấm Lưu đầu tiên
  const [saving, setSaving] = useState(false);
  const specsReq = useRef(0);

  useEffect(() => {
    listSuites().then(setSuites).catch((e) => toast.error(getErrorMessage(e, "Cannot load suites.")));
    listCases().then(setExisting).catch(() => setExisting([]));
  }, []);

  const set = (key, v) => setForm((f) => ({ ...f, [key]: v }));

  const pickSuite = async (suiteId) => {
    setForm((f) => ({ ...f, suiteId, specId: "" }));
    setSpecs([]);
    if (!suiteId) return;
    const req = ++specsReq.current; // bỏ kết quả cũ nếu người dùng đổi suite nhanh
    try {
      const list = await listSpecs(suiteId);
      if (req !== specsReq.current) return;
      setSpecs(list);
      if (list.length === 1) set("specId", String(list[0].id)); // chỉ có một spec -> chọn luôn
    } catch (e) {
      toast.error(getErrorMessage(e, "Cannot load specs."));
    }
  };

  // Gợi ý mã kế tiếp theo dạng TC-nn đang dùng nhiều nhất.
  const suggestedCode = useMemo(() => {
    let max = 0;
    let width = 2;
    for (const c of existing) {
      const m = /^TC-(\d+)$/.exec(c.code);
      if (m) { max = Math.max(max, Number(m[1])); width = Math.max(width, m[1].length); }
    }
    return `TC-${String(max + 1).padStart(width, "0")}`;
  }, [existing]);

  const code = form.code.trim();
  const codeTaken = existing.some((c) => c.code.toLowerCase() === code.toLowerCase());
  const codeError = !code
    ? "Test code is required."
    : code.length > CODE_MAX
      ? `At most ${CODE_MAX} characters.`
      : codeTaken
        ? `${code} already exists.`
        : "";

  // ---- steps -------------------------------------------------------------
  const setStep = (key, patch) => setSteps((l) => l.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  const changeAction = (s, action) => {
    // Đổi giữa "đường dẫn" và "locator" thì target cũ vô nghĩa: dọn đi để khỏi hiểu nhầm.
    const wasLoc = isLocatorAction(s.action);
    const isLoc = isLocatorAction(action);
    let target = s.target;
    if (wasLoc !== isLoc || !s.action) target = isLoc ? `${action === "FILL" ? "placeholder" : "text"}=` : "";
    setStep(s.key, { action, target, field: action === "FILL" ? s.field : "" });
  };
  const move = (i, d) =>
    setSteps((l) => {
      const j = i + d;
      if (j < 0 || j >= l.length) return l;
      const c = [...l];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });
  const dup = (i) =>
    setSteps((l) => {
      const { key: _k, ...rest } = l[i];
      return [...l.slice(0, i + 1), newStep(rest), ...l.slice(i + 1)];
    });
  const drop = (key) => setSteps((l) => (l.length > 1 ? l.filter((s) => s.key !== key) : [newStep()]));

  const filled = steps.filter((s) => s.action);
  const problems = stepProblems(steps);
  const stepErrors = problems.filter((p) => p.level === "error");
  const stepWarns = problems.filter((p) => p.level === "warn");

  // ---- test data ---------------------------------------------------------
  const required = requiredDataFields(steps);
  const dataRows = useMemo(
    () => [
      ...new Map([
        ...required.map((f) => [f, { field: f, value: "", isValid: true }]),
        ...testData.map((d) => [d.field, d]),
      ]).values(),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [required.join("|"), testData],
  );
  const setData = (field, patch) =>
    setTestData((l) =>
      l.some((d) => d.field === field)
        ? l.map((d) => (d.field === field ? { ...d, ...patch } : d))
        : [...l, { field, value: "", isValid: true, ...patch }],
    );
  const missingData = required.filter((f) => !dataRows.find((d) => d.field === f)?.value);

  // ---- checklist ---------------------------------------------------------
  const basicsOk =
    !!form.specId && !codeError && !!form.title.trim() && !!form.expectedResult.trim();
  const checks = [
    { ok: !!form.specId, text: "Suite and spec chosen" },
    { ok: !codeError, text: "Test code is valid and unused" },
    { ok: !!form.title.trim() && !!form.expectedResult.trim(), text: "Title and expected result filled" },
    { ok: filled.length > 0 && stepErrors.length === 0, text: "Steps complete, no errors" },
    { ok: filled.length > 0 && missingData.length === 0, text: "Every data field has a value" },
  ];
  const readyOk = checks.every((c) => c.ok);

  // ---- lưu ---------------------------------------------------------------
  const handleSave = async (markReady) => {
    setTouched(true);
    if (!basicsOk) return toast.error("Finish section 1 first (fields marked *).");
    if (markReady && !readyOk) return toast.error("Cannot mark ready yet: see the checklist on the right.");

    setSaving(true);
    let id;
    try {
      // Thứ tự bắt buộc: tạo draft -> steps -> data -> mới nâng lên ready.
      const saved = await createCase({ ...form, code, status: "draft" }); // POST /catalog/cases
      id = saved.id;
      const keep = filled;
      const demoted = [
        keep.length ? await saveSteps(id, keep) : "",
        dataRows.some((d) => d.value) ? await saveCaseData(id, dataRows) : "",
      ].filter(Boolean);
      if (markReady) await updateCase(id, { ...form, status: "ready" }); // PUT /catalog/cases/:id
      toast.success(`Created ${code}${markReady ? " — ready to run" : " as draft"}.`);
      if (demoted.length && markReady) toast.error(demoted[0], { duration: 8000 });
      navigate("/testcases");
    } catch (err) {
      toast.error(getErrorMessage(err, "Cannot save the test case."));
      if (id) {
        // Case đã được tạo (draft) nhưng bước sau hỏng: nói rõ, kẻo bấm lại sẽ nhận 409.
        toast.error(`${code} was created as a draft — reopen it to finish.`, { duration: 8000 });
        navigate("/testcases");
      }
    } finally {
      setSaving(false);
    }
  };

  const showErr = (cond, msg) => (touched && cond ? msg : "");

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        breadcrumb={["Test Cases", "New"]}
        title="Create Test Case"
        description="Declare a test case: what it is, which steps it runs, and which data it uses."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        {/* ------------------------------- cột trái ------------------------------- */}
        <div className="space-y-5">
          <Section n={1} title="Basic information" hint="Where the case belongs and what it is for." done={basicsOk}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Suite" required error={showErr(!form.suiteId, "Choose a suite.")}>
                <select className={inputCls} value={form.suiteId} onChange={(e) => pickSuite(e.target.value)}>
                  <option value="">Choose a suite…</option>
                  {suites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>
              <Field
                label="Spec"
                required
                hint={form.suiteId && specs.length === 0 ? "This suite has no specs yet." : "The screen or feature under test."}
                error={showErr(form.suiteId && !form.specId, "Choose a spec.")}
              >
                <select className={inputCls} value={form.specId} disabled={!form.suiteId} onChange={(e) => set("specId", e.target.value)}>
                  <option value="">{form.suiteId ? "Choose a spec…" : "Choose a suite first"}</option>
                  {specs.map((s) => <option key={s.id} value={s.id}>{s.code}{s.screen ? ` – ${s.screen}` : ""}</option>)}
                </select>
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
              <Field
                label="Test code"
                required
                error={showErr(!!codeError, codeError) || (code && codeTaken ? codeError : "")}
                hint="Cannot be changed after creation."
              >
                <input className={inputCls} value={form.code} maxLength={CODE_MAX + 10}
                       placeholder={suggestedCode} onChange={(e) => set("code", e.target.value)} />
                {!form.code && (
                  <button type="button" onClick={() => set("code", suggestedCode)}
                          className="mt-1 text-xs text-brand-600 hover:underline">
                    Use {suggestedCode}
                  </button>
                )}
              </Field>
              <Field label="Title" required error={showErr(!form.title.trim(), "Title is required.")}>
                <input className={inputCls} placeholder="Login fails with a wrong password"
                       value={form.title} onChange={(e) => set("title", e.target.value)} />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Type">
                <select className={inputCls} value={form.type} onChange={(e) => set("type", e.target.value)}>
                  {CASE_TYPES.map((o) => <option key={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="Priority">
                <div className="flex gap-1">
                  {CASE_PRIORITIES.map((p) => (
                    <button key={p} type="button" onClick={() => set("priority", p)}
                            className={`h-10 flex-1 rounded-lg border text-xs font-medium capitalize transition ${
                              form.priority === p
                                ? "border-brand-600 bg-brand-50 text-brand-700"
                                : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                            }`}>
                      {p}
                    </button>
                  ))}
                </div>
              </Field>
            </div>

            <Field label="Expected result" required error={showErr(!form.expectedResult.trim(), "Describe the correct outcome.")}
                   hint="What the user sees when this test PASSES.">
              <textarea rows={2} className={areaCls} value={form.expectedResult}
                        onChange={(e) => set("expectedResult", e.target.value)} />
            </Field>
            <Field label="Preconditions" hint="Optional. State required before the test runs.">
              <textarea rows={2} className={areaCls} value={form.preconditions}
                        onChange={(e) => set("preconditions", e.target.value)} />
            </Field>
          </Section>

          <Section
            n={2}
            title="Steps"
            hint="What the user does, in order. Pick an action, then point at the element."
            done={filled.length > 0 && stepErrors.length === 0}
          >
            {steps.length === 1 && !steps[0].action && (
              <div className="flex flex-wrap items-center gap-2 rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700">
                <span>Quick start:</span>
                <button type="button" onClick={() => setSteps(LOGIN_TEMPLATE())}
                        className="rounded-md bg-white px-2 py-1 font-medium shadow-sm hover:bg-brand-100">
                  Login flow (5 steps)
                </button>
                <span className="text-brand-600/70">A skeleton — just fill in the locators.</span>
              </div>
            )}

            <ol className="m-0 list-none space-y-3 p-0">
              {steps.map((s, i) => {
                const loc = splitTarget(s.target);
                const probs = explain(s);
                return (
                  <li key={s.key} className="rounded-xl border border-gray-200 bg-gray-50/60 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-gray-500 ring-1 ring-gray-200">
                        {i + 1}
                      </span>
                      <div className="flex flex-1 flex-wrap gap-1">
                        {ACTIONS.map((a) => (
                          <button key={a.value} type="button" title={a.hint} onClick={() => changeAction(s, a.value)}
                                  className={`h-8 rounded-lg border px-3 text-xs font-medium transition ${
                                    s.action === a.value
                                      ? "border-brand-600 bg-brand-600 text-white"
                                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                                  }`}>
                            {a.label}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center text-gray-400">
                        <button type="button" title="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="p-1.5 hover:text-gray-700 disabled:opacity-30"><ArrowUp size={15} /></button>
                        <button type="button" title="Move down" disabled={i === steps.length - 1} onClick={() => move(i, 1)} className="p-1.5 hover:text-gray-700 disabled:opacity-30"><ArrowDown size={15} /></button>
                        <button type="button" title="Duplicate step" onClick={() => dup(i)} className="p-1.5 hover:text-gray-700"><Copy size={15} /></button>
                        <button type="button" title="Delete step" onClick={() => drop(s.key)} className="p-1.5 hover:text-red-600"><Trash2 size={15} /></button>
                      </div>
                    </div>

                    {!s.action && <p className="mt-2 pl-8 text-xs text-gray-400">Choose what this step does.</p>}

                    {s.action === "NAVIGATE" && (
                      <div className="mt-2 pl-8">
                        <input className={inputCls} placeholder="/login" value={s.target}
                               onChange={(e) => setStep(s.key, { target: e.target.value })} />
                      </div>
                    )}

                    {isLocatorAction(s.action) && (
                      <div className="mt-2 space-y-2 pl-8">
                        <div className="grid gap-2 sm:grid-cols-[190px_minmax(0,1fr)]">
                          <select className={inputCls} value={loc.kind}
                                  onChange={(e) => setStep(s.key, { target: joinTarget(e.target.value, loc.value) })}>
                            {LOCATOR_KINDS.map((k) => <option key={k.value} value={k.value}>{LOCATOR_LABEL[k.value]}</option>)}
                          </select>
                          <input className={inputCls} value={loc.value}
                                 placeholder={s.action === "VERIFY" ? "Leave empty to check the current URL" : LOCATOR_HELP[loc.kind]}
                                 onChange={(e) => setStep(s.key, { target: joinTarget(loc.kind, e.target.value) })} />
                        </div>
                        {s.action === "FILL" && (
                          <div className="grid items-center gap-2 sm:grid-cols-[190px_minmax(0,1fr)]">
                            <span className="text-xs font-medium text-gray-600">Value from data field</span>
                            <input className={`${inputCls} font-mono`} list="data-names" placeholder="username"
                                   value={s.field} onChange={(e) => setStep(s.key, { field: e.target.value.trim() })} />
                          </div>
                        )}
                      </div>
                    )}

                    {s.action && (
                      <div className="mt-2 pl-8">
                        <p className="m-0 text-xs text-gray-500">→ {describeStep(s)}</p>
                        {(s.expected || s.noteOpen) ? (
                          <input className={`${inputCls} mt-2`} placeholder="Note / expected result for this step (optional)"
                                 value={s.expected} onChange={(e) => setStep(s.key, { expected: e.target.value })} />
                        ) : (
                          <button type="button" onClick={() => setStep(s.key, { noteOpen: true })}
                                  className="mt-1 text-xs text-brand-600 hover:underline">+ Add note</button>
                        )}
                        {probs.map((p, k) => (
                          <p key={k} className={`m-0 mt-1 text-xs ${p.level === "error" ? "text-red-600" : "text-amber-600"}`}>
                            {p.text}
                          </p>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
            <datalist id="data-names">
              <option value="username" /><option value="password" /><option value="email" />
            </datalist>

            <button type="button" onClick={() => setSteps((l) => [...l, newStep()])}
                    className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">
              <Plus size={15} /> Add step
            </button>
            {touched && filled.length === 0 && (
              <p className="m-0 text-xs text-gray-500">No steps yet: you can still save a draft, but it cannot run.</p>
            )}
          </Section>

          <Section
            n={3}
            title="Test data"
            hint="Concrete values for the fields your “Type text” steps need. Listed automatically from section 2."
            done={filled.length > 0 && missingData.length === 0 && dataRows.length > 0}
          >
            {dataRows.length === 0 ? (
              <p className="m-0 text-sm text-gray-500">
                No data needed yet. When you add a “Type text” step, its field appears here.
              </p>
            ) : (
              <div className="space-y-2">
                {dataRows.map((row) => {
                  const missing = !row.value;
                  return (
                    <div key={row.field} className="grid items-center gap-2 sm:grid-cols-[140px_minmax(0,1fr)_auto]">
                      <span className="font-mono text-sm text-gray-700">{row.field}</span>
                      <input className={`${inputCls} font-mono ${missing ? "border-amber-400" : ""}`}
                             placeholder="Value, or env:VAR_NAME for secrets"
                             value={row.value ?? ""} onChange={(e) => setData(row.field, { value: e.target.value })} />
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1 text-xs text-gray-500" title="Deliberately invalid data (negative test)">
                          <input type="checkbox" checked={row.isValid === false}
                                 onChange={(e) => setData(row.field, { isValid: !e.target.checked })} />
                          Wrong on purpose
                        </label>
                        {!required.includes(row.field) && (
                          <button type="button" title="Remove field" className="text-gray-400 hover:text-red-600"
                                  onClick={() => setTestData((l) => l.filter((d) => d.field !== row.field))}>
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {missingData.length > 0 && (
                  <p className="m-0 text-xs text-amber-600">Missing values: {missingData.join(", ")}.</p>
                )}
              </div>
            )}
          </Section>
        </div>

        {/* ------------------------------- cột phải ------------------------------- */}
        <aside className="space-y-4 lg:sticky lg:top-0">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h3 className="m-0 mb-3 text-sm font-semibold text-gray-900">
              {readyOk ? "Ready to run" : "Before it can run"}
            </h3>
            <ul className="m-0 list-none space-y-2 p-0">
              {checks.map((c) => (
                <li key={c.text} className={`flex items-start gap-2 text-sm ${c.ok ? "text-gray-700" : "text-gray-500"}`}>
                  {c.ok ? <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-green-600" /> : <Circle size={16} className="mt-0.5 shrink-0 text-gray-300" />}
                  {c.text}
                </li>
              ))}
            </ul>
            {stepWarns.length > 0 && (
              <p className="m-0 mt-3 text-xs text-amber-600">{stepWarns.length} warning(s) in Steps.</p>
            )}
          </div>

          <div className="space-y-2">
            <button type="button" disabled={saving || !readyOk} onClick={() => handleSave(true)}
                    title={readyOk ? "" : "Complete every item above to mark ready"}
                    className="h-10 w-full rounded-lg bg-brand-600 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50">
              {saving ? "Saving…" : "Save & mark ready"}
            </button>
            <button type="button" disabled={saving} onClick={() => handleSave(false)}
                    className="h-10 w-full rounded-lg border border-gray-300 bg-white text-sm font-semibold text-gray-800 transition hover:bg-gray-50 disabled:opacity-50">
              Save as draft
            </button>
            <button type="button" disabled={saving} onClick={() => navigate("/testcases")}
                    className="h-9 w-full text-sm text-gray-500 hover:text-gray-800">
              Cancel
            </button>
          </div>
          <p className="m-0 text-xs text-gray-400">
            A draft can be saved any time. Only “ready” cases can be included in a run.
          </p>
        </aside>
      </div>
    </div>
  );
}
