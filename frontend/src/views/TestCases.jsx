// Trang Test Cases (/testcases) – nơi duy nhất làm mọi việc với test case:
// liệt kê, lọc, tạo, xem chi tiết, sửa, deprecate, xoá, và thêm case vào template (issue #41).
import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Eye, X, Pencil, Archive, Copy, AlertTriangle, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../controllers/AuthContext";
import { canManageCases } from "../models/permissions";
import { CASE_TYPES, CASE_PRIORITIES, CASE_STATUSES } from "../models/options";
import {
  STEP_ACTIONS, LOCATOR_KINDS, isLocatorAction, splitTarget, joinTarget,
  requiredDataFields, stepProblems,
} from "../models/testSteps";
import {
  listCases, listSuites, listSpecs, getCase, createCase, updateCase, deprecateCase,
  saveSteps, saveCaseData,
} from "../services/catalogService";
import { listTemplates, updateTemplate } from "../services/templateService";
import { getErrorMessage } from "../services/authService";
import FilterBar from "../components/ui/FilterBar";
import FilterMenu from "../components/ui/FilterMenu";
import RowMenu from "../components/ui/RowMenu";
import CreateButton from "../components/ui/CreateButton";

const inputCls = "w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";
const labelCls = "block text-xs font-semibold text-gray-600 mb-1";
const BADGE = {
  ready: "bg-green-100 text-green-700",
  draft: "bg-gray-100 text-gray-600",
  deprecated: "bg-orange-100 text-orange-700",
};
const PRIORITY_BADGE = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};
// `field` chỉ dùng cho bước FILL: tên field trong test_data lấy giá trị để điền.
const EMPTY_STEP = { action: "", target: "", expected: "", field: "" };
const EMPTY = {
  suiteId: "", specId: "", code: "", title: "", preconditions: "",
  expectedResult: "", priority: "medium", type: "functional", status: "draft",
  steps: [{ ...EMPTY_STEP }], testData: [],
};

// Case từ API -> giá trị form sửa (luôn để sẵn 1 dòng step trống cho dễ nhập).
const toForm = (c) => ({
  ...c,
  suiteId: c.suiteId ?? "",
  specId: c.specId ?? "",
  steps: c.steps.length ? c.steps : [{ ...EMPTY_STEP }],
  testData: c.testData ?? [],
});

export default function TestCases() {
  const { user } = useAuth();
  const canEdit = canManageCases(user?.role);

  const [cases, setCases] = useState([]);
  const [suites, setSuites] = useState([]);
  const [specs, setSpecs] = useState([]);       // spec của suite đang chọn trong form
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  // Mảng rỗng = không lọc nhóm đó.
  const [filters, setFilters] = useState({ suite: [], status: [], type: [] });
  const { suite: fSuite, status: fStatus, type: fType } = filters;
  const [reloadKey, setReloadKey] = useState(0);
  const [form, setForm] = useState(null);       // null = đóng modal tạo/sửa
  const [detail, setDetail] = useState(null);   // null = đóng modal xem
  const [toRetire, setToRetire] = useState(null); // null = đóng modal xác nhận deprecate
  const [sel, setSel] = useState([]);           // tc_code đang tick, để thêm vào template
  const [addTo, setAddTo] = useState("");       // id template đang chọn ở thanh "Add to template"
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listSuites().then(setSuites).catch((e) => toast.error(getErrorMessage(e, "Cannot load suites.")));
    // Dùng cho "Used in templates" và "Add to template" – lọc ở client, API chưa có endpoint riêng.
    listTemplates().then(setTemplates).catch(() => setTemplates([]));
  }, [reloadKey]);

  // GET /catalog/cases?suite=&status=&type=  (q và trường hợp chọn nhiều giá trị thì lọc ở client)
  useEffect(() => {
    let off = false;
    setLoading(true);
    const one = (a) => (a.length === 1 ? a[0] : undefined);
    listCases({ suite: one(fSuite), status: one(fStatus), type: one(fType) })
      .then((l) =>
        !off &&
        setCases(
          l.filter(
            (c) =>
              (fSuite.length === 0 || fSuite.includes(String(c.suiteId))) &&
              (fStatus.length === 0 || fStatus.includes(c.status)) &&
              (fType.length === 0 || fType.includes(c.type)),
          ),
        ))
      .catch((e) => !off && toast.error(getErrorMessage(e, "Cannot load test cases.")))
      .finally(() => !off && setLoading(false));
    return () => { off = true; };
  }, [fSuite, fStatus, fType, reloadKey]);

  const shown = useMemo(() => {
    const k = q.trim().toLowerCase();
    return k ? cases.filter((c) => c.code.toLowerCase().includes(k) || c.title.toLowerCase().includes(k)) : cases;
  }, [cases, q]);

  // Template trỏ tới cả một suite thì không thêm lẻ từng case được.
  const addableTemplates = useMemo(
    () => templates.filter((t) => !t.suiteId),
    [templates],
  );
  const usedIn = (code) => templates.filter((t) => t.targetTestIds?.includes(code));

  const refresh = () => { setSel([]); setReloadKey((k) => k + 1); };

  // Soi lại ĐÚNG luật mà runner thi hành (models/testSteps.js) để báo trước thay vì
  // để người dùng phát hiện lúc run fail hoặc nhận 409 "No ready test cases".
  const problems = form ? stepProblems(form.steps) : [];
  const required = form ? requiredDataFields(form.steps) : [];
  const dataByField = new Map((form?.testData ?? []).map((d) => [d.field, d]));
  // Dòng test_data rỗng cũng là thiếu: runner sẽ điền chuỗi rỗng rồi fail ở bước sau.
  const missingData = required.filter((f) => !dataByField.get(f)?.value);
  const stepErrors = problems.filter((p) => p.level === "error");
  // 'ready' là lời hứa "bấm Run là chạy được"; backend cũng kiểm lại (409 NOT_RUNNABLE).
  const runnable = stepErrors.length === 0 && missingData.length === 0;
  const canBeReady = runnable;

  // Mỗi field runner cần + mọi dòng test_data đang có trong DB. Dòng sau đè dòng trước,
  // nên field vừa có trong steps vừa có trong DB hiện ra với giá trị thật.
  const dataRows = form
    ? [...new Map([
        ...required.map((f) => [f, { field: f, value: "", isValid: true }]),
        ...(form.testData ?? []).map((d) => [d.field, d]),
      ]).values()]
    : [];

  const setData = (field, key, v) =>
    setForm((f) => {
      const list = f.testData ?? [];
      const at = list.findIndex((d) => d.field === field);
      if (at < 0) return { ...f, testData: [...list, { field, value: "", isValid: true, [key]: v }] };
      return { ...f, testData: list.map((d, i) => (i === at ? { ...d, [key]: v } : d)) };
    });

  const dropData = (field) =>
    setForm((f) => ({ ...f, testData: (f.testData ?? []).filter((d) => d.field !== field) }));

  // Chọn suite trong form -> GET /catalog/suites/:id/specs
  const pickSuite = async (suiteId, keepSpec) => {
    setForm((f) => ({ ...f, suiteId, specId: keepSpec ? f.specId : "" }));
    setSpecs([]);
    if (!suiteId) return;
    try { setSpecs(await listSpecs(suiteId)); }
    catch (e) { toast.error(getErrorMessage(e, "Cannot load specs.")); }
  };

  const setStep = (i, key, v) =>
    setForm((f) => ({ ...f, steps: f.steps.map((s, j) => (j === i ? { ...s, [key]: v } : s)) }));

  const openEdit = async (c) => {
    try {
      const full = await getCase(c.id);                 // GET /catalog/cases/:id (có steps)
      setForm(toForm(full));
      setDetail(null);
    } catch (e) { toast.error(getErrorMessage(e, "Cannot load the test case.")); }
  };

  // Nhân bản: mở modal TẠO MỚI mang theo steps của case nguồn, chỉ xoá mã để người dùng gõ mã mới.
  // test_data KHÔNG theo sang (chưa có endpoint ghi), nên panel Test data bên dưới sẽ liệt kê
  // đúng những field còn thiếu. Status thừa hưởng từ case nguồn và vẫn sửa được ở ô Status:
  // ép 'draft' ở đây sẽ khoá case mới lại mãi, vì Edit không đặt được status.
  // specLocked: GET /catalog/cases/:id không trả suite_id (cột đó ở test_specs), nên không dựng
  // lại được 2 ô Suite/Spec — spec của case nguồn hiện ở dạng chỉ đọc.
  const openClone = async (c) => {
    try {
      const full = await getCase(c.id);
      setForm({ ...toForm(full), id: undefined, code: "", testData: [], specLocked: true });
      setDetail(null);
    } catch (e) { toast.error(getErrorMessage(e, "Cannot load the test case.")); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!canEdit) return toast.error("You do not have permission.");
    if (!form.id && !form.specId) return toast.error("Pick a suite and a spec.");
    if (!form.id && !form.code.trim()) return toast.error("Test code is required (e.g. TC-45).");
    if (!form.title.trim()) return toast.error("Title is required.");
    if (!form.expectedResult.trim()) return toast.error("Expected result is required.");
    // Chặn tại chỗ thay vì để backend trả 409 NOT_RUNNABLE với câu khó hiểu hơn.
    if (form.status === "ready" && !canBeReady) {
      const why = stepErrors[0]?.text || `thiếu test_data: ${missingData.join(", ")}`;
      return toast.error(`Chưa thể đặt 'ready': ${why}`);
    }
    setSaving(true);
    // Khai ngoài try: nếu bước sau hỏng thì case ĐÃ tạo rồi, phải nói ra — không thì người
    // dùng bấm Create lại và chỉ nhận 409 "tc_code đã tồn tại".
    let id = form.id;
    try {
      // Thứ tự bắt buộc: steps + test_data trước, rồi mới đặt test_status. Backend kiểm
      // "chạy được chưa" ngay lúc PUT case, nên đặt 'ready' trước là chắc chắn 409.
      if (!id) {
        // Tạo ở 'draft' rồi nâng lên sau: case mới chưa có bước nào, tạo thẳng 'ready' sẽ
        // bị backend hạ về draft ở bước lưu steps.
        const saved = await createCase({ ...form, status: "draft" });  // POST /catalog/cases (201/409/400)
        id = saved.id;
      }
      const demoted = [await saveSteps(id, form.steps), await saveCaseData(id, dataRows)].filter(Boolean);
      if (form.id || form.status !== "draft") await updateCase(id, form); // PUT /catalog/cases/:id
      toast.success(form.id ? `Updated ${form.code}.` : `Created ${form.code}.`);
      if (demoted.length) toast.error(demoted[0], { duration: 8000 });
      setForm(null);
      refresh();
    } catch (err) {
      toast.error(getErrorMessage(err, "Cannot save the test case."));  // 409 -> "tc_code ... đã tồn tại"
      if (!form.id && id) {
        toast.error(`${form.code} đã được tạo ở trạng thái draft — mở lại case đó để sửa tiếp.`,
                    { duration: 8000 });
        setForm(null);
        refresh();
      }
    } finally { setSaving(false); }
  };

  const openDetail = async (c) => {
    try { setDetail(await getCase(c.id)); }              // GET /catalog/cases/:id
    catch (e) { toast.error(getErrorMessage(e, "Cannot load detail.")); }
  };

  // Không có DELETE /catalog/cases/:id — và cũng không nên có: lịch sử chạy trỏ vào case.
  // "Bỏ" một case = đưa về deprecated, runner sẽ không nhận nữa.
  const handleRetire = async () => {
    if (!canEdit) return toast.error("You do not have permission.");
    try {
      await deprecateCase(toRetire.id);                   // PUT /catalog/cases/:id
      toast.success(`${toRetire.code} deprecated.`);
      setToRetire(null); setDetail(null);
      refresh();
    } catch (e) {
      toast.error(getErrorMessage(e, "Cannot deprecate the test case."));
    }
  };

  // Thêm các case đang tick vào target_json.testIds của một template có sẵn.
  const handleAddToTemplate = async () => {
    if (!canEdit) return toast.error("You do not have permission.");
    const tpl = templates.find((t) => String(t.id) === String(addTo));
    if (!tpl) return toast.error("Pick a template.");
    const merged = [...new Set([...(tpl.targetTestIds || []), ...sel])];
    try {
      await updateTemplate(tpl.id, { ...tpl, targetTestIds: merged }); // PUT /templates/:id
      toast.success(`Added ${sel.length} test case(s) to ${tpl.name}.`);
      setAddTo("");
      refresh();
    } catch (e) { toast.error(getErrorMessage(e, "Cannot update the template.")); }
  };

  const toggleSel = (code) =>
    setSel((s) => (s.includes(code) ? s.filter((c) => c !== code) : [...s, code]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Test Case Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            {canEdit
              ? "Declare, reuse, and retire the test cases a template can run."
              : "You have read-only access to test cases."}
          </p>
        </div>
        {canEdit && (
          <CreateButton onClick={() => { setForm(EMPTY); setSpecs([]); }} />
        )}
      </div>

      <FilterBar
        value={q}
        onChange={setQ}
        placeholder="Search code / title"
        onRefresh={refresh}
        loading={loading}
      >
        <FilterMenu
          groups={[
            {
              key: "suite",
              label: "Suite",
              allLabel: "All suites",
              options: suites.map((s) => ({ value: String(s.id), label: s.name })),
            },
            { key: "status", label: "Status", allLabel: "All status", options: CASE_STATUSES },
            { key: "type", label: "Type", allLabel: "All types", options: CASE_TYPES },
          ]}
          value={filters}
          onChange={setFilters}
        />
      </FilterBar>

      {/* Thanh thao tác hàng loạt – dùng lại case cho template có sẵn */}
      {canEdit && sel.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 bg-brand-50 border border-brand-200 rounded-xl px-4 py-2 text-sm">
          <span className="font-medium">{sel.length} selected</span>
          <select className={`${inputCls} w-auto`} value={addTo} onChange={(e) => setAddTo(e.target.value)}>
            <option value="">— choose a template —</option>
            {addableTemplates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <button onClick={handleAddToTemplate} disabled={!addTo}
            className="px-3 py-1.5 bg-brand-600 text-white rounded-xl disabled:opacity-50">Add to template</button>
          <button onClick={() => setSel([])} className="text-gray-500 hover:text-gray-800">Clear</button>
          {addableTemplates.length === 0 && (
            <span className="text-xs text-gray-500">No template takes individual test cases (suite-based templates are excluded).</span>
          )}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
        {loading ? <p className="p-6 text-sm text-gray-500">Loading…</p> : shown.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">No test cases.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-gray-500 bg-gray-50">
              <tr>
                {canEdit && <th className="p-3 w-8" />}
                <th className="p-3">Code</th><th>Title</th><th>Spec</th><th>Type</th><th>Priority</th><th>Status</th><th>Used in</th><th />
              </tr>
            </thead>
            <tbody>
              {shown.map((c) => (
                <tr key={c.id} className="border-t border-gray-100">
                  {canEdit && (
                    <td className="p-3">
                      <input type="checkbox" checked={sel.includes(c.code)} onChange={() => toggleSel(c.code)} />
                    </td>
                  )}
                  <td className="p-3 font-mono text-xs">{c.code}</td>
                  <td>{c.title}</td>
                  <td className="text-xs text-gray-500">{c.specCode}</td>
                  <td>{c.type}</td>
                  <td>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${PRIORITY_BADGE[c.priority] || PRIORITY_BADGE.medium}`}>{c.priority}</span>
                  </td>
                  <td><span className={`px-2 py-0.5 rounded-full text-xs ${BADGE[c.status] || BADGE.draft}`}>{c.status}</span></td>
                  <td className="text-xs text-gray-500">{usedIn(c.code).length || "—"}</td>
                  <td className="text-right pr-3 whitespace-nowrap">
                    {canEdit ? (
                      <>
                        <button onClick={() => openEdit(c)} className="p-2 text-gray-500 hover:text-brand-600" title="Edit steps"><Pencil size={16} /></button>
                        <button onClick={() => openClone(c)} className="p-2 text-gray-500 hover:text-brand-600" title="Nhân bản (copy steps sang case mới)"><Copy size={16} /></button>
                        {c.status !== "deprecated" && (
                          <RowMenu
                            items={[
                              { label: "Deprecate", icon: Archive, onClick: () => setToRetire(c), danger: true },
                            ]}
                          />
                        )}
                      </>
                    ) : (
                      <button onClick={() => openDetail(c)} className="p-2 text-gray-500 hover:text-brand-600" title="View"><Eye size={16} /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal tạo / sửa test case */}
      {form && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-xl w-full max-w-3xl p-5 space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">{form.id ? "Edit Test Case" : "Create Test Case"}</h3>
              <button type="button" onClick={() => setForm(null)} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
            </div>
            <fieldset disabled={saving} className="space-y-3">
              {form.specLocked && (
                <p className="rounded-xl bg-gray-50 border border-gray-200 p-3 text-xs text-gray-600">
                  Nhân bản từ <span className="font-mono">{form.specCode || `spec #${form.specId}`}</span>.
                  Spec giữ nguyên theo case nguồn; test_data không được copy nên hãy đặt mã mới rồi
                  bổ sung dữ liệu ở phần dưới.
                </p>
              )}
              {!form.id && !form.specLocked && (
                <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Suite *</label>
                  <select className={inputCls} value={form.suiteId} onChange={(e) => pickSuite(e.target.value)}>
                    <option value="">— choose —</option>
                    {suites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Spec *</label>
                  <select className={inputCls} value={form.specId} onChange={(e) => setForm({ ...form, specId: e.target.value })} disabled={!form.suiteId}>
                    <option value="">— choose —</option>
                    {specs.map((s) => <option key={s.id} value={s.id}>{s.code}{s.screen ? ` – ${s.screen}` : ""}</option>)}
                  </select>
                </div>
              </div>
                </>
              )}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className={labelCls}>Test code *</label>
                  {/* tc_code bất biến sau khi tạo (updateCaseSchema .omit) */}
                  <input className={inputCls} placeholder="TC-45" value={form.code} disabled={!!form.id}
                         onChange={(e) => setForm({ ...form, code: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Title *</label>
                  <input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Preconditions</label>
                  <textarea rows={2} className={inputCls} value={form.preconditions} onChange={(e) => setForm({ ...form, preconditions: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls}>Expected result *</label>
                  <textarea rows={2} className={inputCls} value={form.expectedResult} onChange={(e) => setForm({ ...form, expectedResult: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[["Type", "type", CASE_TYPES], ["Priority", "priority", CASE_PRIORITIES], ["Status", "status", CASE_STATUSES]].map(([label, key, opts]) => (
                  <div key={key}>
                    <label className={labelCls}>{label}</label>
                    <select className={inputCls} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}>
                      {opts.map((o) => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 -mt-2">
                Chỉ case “ready” mới được đưa vào run, và chỉ đặt được “ready” khi phần
                Test data bên dưới không còn thiếu field nào.
                {form.id && ` Spec ${form.specCode || `#${form.specId}`} không đổi được sau khi tạo.`}
              </p>
              <div>
                <div className="flex items-baseline justify-between mb-1">
                  <label className={labelCls}>Steps</label>
                  <span className="text-xs text-gray-400">
                    Action + locator = <b>cách thực thi</b>. Giá trị để điền nằm ở Test data.
                  </span>
                </div>
                {form.steps.map((s, i) => {
                  const action = String(s.action || "").toUpperCase();
                  const loc = splitTarget(s.target);
                  return (
                    <div key={i} className="mb-1.5 rounded-xl border border-gray-200 bg-gray-50/60 p-2 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-6 shrink-0 font-mono text-xs text-gray-400">#{i + 1}</span>
                        <select className={`${inputCls} basis-32 shrink-0`} value={action}
                                onChange={(e) => setStep(i, "action", e.target.value)}>
                          <option value="">— action —</option>
                          {STEP_ACTIONS.map((a) => <option key={a}>{a}</option>)}
                        </select>

                        {action === "NAVIGATE" ? (
                          <input className={`${inputCls} min-w-0 flex-1`} placeholder="/login"
                                 value={s.target} onChange={(e) => setStep(i, "target", e.target.value)} />
                        ) : isLocatorAction(action) ? (
                          <>
                            <select className={`${inputCls} basis-36 shrink-0`} value={loc.kind}
                                    onChange={(e) => setStep(i, "target", joinTarget(e.target.value, loc.value))}>
                              {LOCATOR_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
                            </select>
                            <input className={`${inputCls} min-w-0 flex-1`} value={loc.value}
                                   placeholder={action === "VERIFY" ? "để trống = kiểm tra expected_url" : "Sign In"}
                                   onChange={(e) => setStep(i, "target", joinTarget(loc.kind, e.target.value))} />
                          </>
                        ) : (
                          <input className={`${inputCls} min-w-0 flex-1`} disabled placeholder="chọn action trước" />
                        )}

                        <button type="button" title="Xoá bước"
                                onClick={() => setForm({ ...form, steps: form.steps.filter((_, j) => j !== i) })}
                                className="shrink-0 text-gray-400 hover:text-red-600"><X size={16} /></button>
                      </div>

                      <div className="flex items-center gap-2 pl-8">
                        <input className={`${inputCls} min-w-0 flex-1`} placeholder="Expected result (chữ cho người đọc)"
                               value={s.expected} onChange={(e) => setStep(i, "expected", e.target.value)} />
                        {action === "FILL" && (
                          <input className={`${inputCls} basis-48 shrink-0 font-mono`} placeholder="field, vd: username"
                                 value={s.field || ""} onChange={(e) => setStep(i, "field", e.target.value)} />
                        )}
                      </div>
                    </div>
                  );
                })}
                <button type="button" onClick={() => setForm({ ...form, steps: [...form.steps, { ...EMPTY_STEP }] })} className="text-sm text-brand-600">+ Add step</button>
              </div>

              {/* Đối chiếu steps với luật của runner và với test_data thật trong DB. */}
              <div className="rounded-xl border border-gray-200 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  {runnable
                    ? <CheckCircle2 size={15} className="text-green-600" />
                    : <AlertTriangle size={15} className="text-orange-500" />}
                  <p className="text-xs font-semibold text-gray-700">
                    Test data &amp; readiness {runnable ? "— đủ để chạy" : "— chưa chạy được"}
                  </p>
                </div>

                {problems.map((pb, k) => (
                  <p key={k} className={`text-xs ${pb.level === "error" ? "text-red-600" : "text-amber-600"}`}>
                    {pb.text}
                  </p>
                ))}

                {dataRows.length === 0 ? (
                  <p className="text-xs text-gray-500">Các bước hiện tại không cần test_data.</p>
                ) : (
                  <table className="w-full text-xs">
                    <tbody>
                      {dataRows.map((row) => {
                        const missing = !row.value;
                        return (
                          <tr key={row.field} className="border-t border-gray-100">
                            <td className="py-1 pr-2 font-mono text-gray-700 whitespace-nowrap">{row.field}</td>
                            <td className="py-1 w-full">
                              <input
                                className={`${inputCls} py-1 font-mono ${missing ? "border-red-300" : ""}`}
                                placeholder="giá trị, hoặc env:TEN_BIEN cho dữ liệu bí mật"
                                value={row.value ?? ""}
                                onChange={(e) => setData(row.field, "value", e.target.value)}
                              />
                            </td>
                            <td className="py-1 pl-2 whitespace-nowrap">
                              {/* is_valid = false: dữ liệu sai có chủ ý (case âm) */}
                              <label className="flex items-center gap-1 text-gray-500">
                                <input type="checkbox" checked={row.isValid === false}
                                       onChange={(e) => setData(row.field, "isValid", !e.target.checked)} />
                                invalid
                              </label>
                            </td>
                            <td className="py-1 pl-1">
                              {!required.includes(row.field) && (
                                <button type="button" title="Xoá field" onClick={() => dropData(row.field)}
                                        className="text-gray-400 hover:text-red-600"><X size={14} /></button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}

                {missingData.length > 0 && (
                  <p className="text-xs text-gray-500">
                    Điền giá trị cho {missingData.join(", ")} rồi Save — test_data lưu cùng lúc với case.
                  </p>
                )}
              </div>
            </fieldset>
            {form.id && (
              <p className="text-xs text-gray-500">
                Used in templates:{" "}
                {usedIn(form.code).map((t) => t.name).join(", ") || "none"}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setForm(null)} className="px-4 py-2 text-sm rounded-xl border border-gray-300">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm rounded-xl bg-brand-600 text-white disabled:opacity-60">{saving ? "Saving…" : form.id ? "Save" : "Create"}</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal xem chi tiết */}
      {detail && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">{detail.code} – {detail.title}</h3>
              <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
            </div>
            <p className="text-sm"><b>Expected:</b> {detail.expectedResult}</p>
            {detail.preconditions && <p className="text-sm"><b>Preconditions:</b> {detail.preconditions}</p>}
            <p className="text-sm text-gray-500">{detail.type} · {detail.priority} · {detail.status}</p>
            <ol className="list-decimal pl-5 text-sm space-y-1">
              {detail.steps.length === 0 && <li className="list-none text-gray-400">No steps.</li>}
              {detail.steps.map((s) => (
                <li key={s.order}>
                  {s.action}
                  {s.target && <span className="text-gray-400"> → {s.target}</span>}
                  {s.field && <span className="text-brand-600 font-mono"> ← data.{s.field}</span>}
                  {s.expected && <span className="text-gray-500"> (expect: {s.expected})</span>}
                </li>
              ))}
            </ol>

            <div className="border-t border-gray-100 pt-3">
              <p className={labelCls}>Used in templates</p>
              {usedIn(detail.code).length === 0 ? (
                <p className="text-sm text-gray-400">Not used by any template yet.</p>
              ) : (
                <ul className="text-sm space-y-0.5">
                  {usedIn(detail.code).map((t) => (
                    <li key={t.id}><Link to="/templates" className="text-brand-600 hover:underline">{t.name}</Link></li>
                  ))}
                </ul>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Modal xác nhận deprecate */}
      {toRetire && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-3">
            <h3 className="text-lg font-bold">Deprecate {toRetire.code}?</h3>
            <p className="text-sm text-gray-600">
              Case vẫn còn trong lịch sử chạy nhưng sẽ không được đưa vào run nữa.
              Mở lại bằng cách đổi Status về draft/ready trong modal sửa.
            </p>
            {usedIn(toRetire.code).length > 0 && (
              <p className="text-sm text-orange-700">
                Still referenced by {usedIn(toRetire.code).length} template(s).
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setToRetire(null)} className="px-3 py-2 text-sm rounded-xl border border-gray-300">Cancel</button>
              <button onClick={handleRetire} className="px-3 py-2 text-sm rounded-xl bg-red-600 text-white">Deprecate</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
