import { useState, useEffect, useMemo } from "react";
import { Plus, Eye, X, Search, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../controllers/AuthContext";
import { canManageCases } from "../models/permissions";
import { CASE_TYPES, CASE_PRIORITIES, CASE_STATUSES } from "../models/options";
import {
  listCases, listSuites, listSpecs, getCase, createCase, saveSteps,
} from "../services/catalogService";
import { getErrorMessage } from "../services/authService";

const inputCls = "w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";
const labelCls = "block text-xs font-semibold text-gray-600 mb-1";
const BADGE = {
  ready: "bg-green-100 text-green-700",
  draft: "bg-gray-100 text-gray-600",
  deprecated: "bg-orange-100 text-orange-700",
};
const EMPTY = {
  suiteId: "", specId: "", code: "", title: "", preconditions: "",
  expectedResult: "", priority: "medium", type: "functional", status: "draft",
  steps: [{ action: "", target: "", expected: "" }],
};

export default function TestCases() {
  const { user } = useAuth();
  const canEdit = canManageCases(user?.role);

  const [cases, setCases] = useState([]);
  const [suites, setSuites] = useState([]);
  const [specs, setSpecs] = useState([]);       // spec của suite đang chọn trong form
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [fSuite, setFSuite] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fType, setFType] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [form, setForm] = useState(null);       // null = đóng modal tạo
  const [detail, setDetail] = useState(null);   // null = đóng modal xem
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listSuites().then(setSuites).catch((e) => toast.error(getErrorMessage(e, "Cannot load suites.")));
  }, []);

  // GET /catalog/cases?suite=&status=&type=  (lọc theo q ở client vì API chưa có q)
  useEffect(() => {
    let off = false;
    setLoading(true);
    listCases({ suite: fSuite || undefined, status: fStatus || undefined, type: fType || undefined })
      .then((l) => !off && setCases(l))
      .catch((e) => !off && toast.error(getErrorMessage(e, "Cannot load test cases.")))
      .finally(() => !off && setLoading(false));
    return () => { off = true; };
  }, [fSuite, fStatus, fType, reloadKey]);

  const shown = useMemo(() => {
    const k = q.trim().toLowerCase();
    return k ? cases.filter((c) => c.code.toLowerCase().includes(k) || c.title.toLowerCase().includes(k)) : cases;
  }, [cases, q]);

  // Chọn suite trong form -> GET /catalog/suites/:id/specs
  const pickSuite = async (suiteId) => {
    setForm((f) => ({ ...f, suiteId, specId: "" }));
    setSpecs([]);
    if (!suiteId) return;
    try { setSpecs(await listSpecs(suiteId)); }
    catch (e) { toast.error(getErrorMessage(e, "Cannot load specs.")); }
  };

  const setStep = (i, key, v) =>
    setForm((f) => ({ ...f, steps: f.steps.map((s, j) => (j === i ? { ...s, [key]: v } : s)) }));

  const handleSave = async (e) => {
    e.preventDefault();
    if (!canEdit) return toast.error("You do not have permission.");
    if (!form.specId) return toast.error("Pick a suite and a spec.");
    if (!form.code.trim()) return toast.error("Test code is required (e.g. TC-45).");
    if (!form.title.trim()) return toast.error("Title is required.");
    if (!form.expectedResult.trim()) return toast.error("Expected result is required.");
    setSaving(true);
    try {
      const created = await createCase(form);           // POST /catalog/cases  (201 / 409 / 400)
      if (form.steps.some((s) => s.action.trim())) {
        try { await saveSteps(created.id, form.steps); } // PUT /catalog/cases/:id/steps
        catch (err) { toast.error(getErrorMessage(err, "Case saved, but steps failed.")); }
      }
      toast.success(`Created ${created.code}.`);
      setForm(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.error(getErrorMessage(err, "Cannot create test case."));  // 409 -> "tc_code ... đã tồn tại"
    } finally { setSaving(false); }
  };

  const openDetail = async (c) => {
    try { setDetail(await getCase(c.id)); }              // GET /catalog/cases/:id
    catch (e) { toast.error(getErrorMessage(e, "Cannot load detail.")); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Test Cases</h1>
        <div className="flex gap-2">
          <button onClick={() => setReloadKey((k) => k + 1)} className="p-2 text-gray-500 hover:text-brand-600" title="Refresh">
            <RefreshCw size={16} />
          </button>
          {canEdit && (
            <button onClick={() => { setForm(EMPTY); setSpecs([]); }}
              className="flex items-center gap-1 px-3 py-2 bg-brand-600 text-white rounded-xl text-sm">
              <Plus size={16} /> Create Test Case
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-3 text-gray-400" />
          <input className={`${inputCls} pl-8`} placeholder="Search code / title" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className={`${inputCls} w-auto`} value={fSuite} onChange={(e) => setFSuite(e.target.value)}>
          <option value="">All suites</option>
          {suites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select className={`${inputCls} w-auto`} value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
          <option value="">All status</option>
          {CASE_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select className={`${inputCls} w-auto`} value={fType} onChange={(e) => setFType(e.target.value)}>
          <option value="">All types</option>
          {CASE_TYPES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
        {loading ? <p className="p-6 text-sm text-gray-500">Loading…</p> : shown.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">No test cases.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-gray-500 bg-gray-50">
              <tr><th className="p-3">Code</th><th>Title</th><th>Spec</th><th>Type</th><th>Priority</th><th>Status</th><th /></tr>
            </thead>
            <tbody>
              {shown.map((c) => (
                <tr key={c.id} className="border-t border-gray-100">
                  <td className="p-3 font-mono text-xs">{c.code}</td>
                  <td>{c.title}</td>
                  <td className="text-xs text-gray-500">{c.specCode}</td>
                  <td>{c.type}</td>
                  <td>{c.priority}</td>
                  <td><span className={`px-2 py-0.5 rounded-full text-xs ${BADGE[c.status] || BADGE.draft}`}>{c.status}</span></td>
                  <td className="text-right pr-3">
                    <button onClick={() => openDetail(c)} className="p-2 text-gray-500 hover:text-brand-600" title="View"><Eye size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal tạo test case */}
      {form && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Create Test Case</h3>
              <button type="button" onClick={() => setForm(null)} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
            </div>
            <fieldset disabled={saving} className="space-y-4">
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
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className={labelCls}>Test code *</label>
                  <input className={inputCls} placeholder="TC-45" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Title *</label>
                  <input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Preconditions</label>
                <textarea rows={2} className={inputCls} value={form.preconditions} onChange={(e) => setForm({ ...form, preconditions: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>Expected result *</label>
                <textarea rows={2} className={inputCls} value={form.expectedResult} onChange={(e) => setForm({ ...form, expectedResult: e.target.value })} />
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
              <p className="text-xs text-gray-400 -mt-2">Only “ready” test cases can be run. New cases default to “draft”.</p>

              <div>
                <label className={labelCls}>Steps</label>
                {form.steps.map((s, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 mb-2">
                    <input className={inputCls} placeholder={`Step ${i + 1} action`} value={s.action} onChange={(e) => setStep(i, "action", e.target.value)} />
                    <input className={inputCls} placeholder="Target (selector)" value={s.target} onChange={(e) => setStep(i, "target", e.target.value)} />
                    <input className={inputCls} placeholder="Expected" value={s.expected} onChange={(e) => setStep(i, "expected", e.target.value)} />
                    <button type="button" onClick={() => setForm({ ...form, steps: form.steps.filter((_, j) => j !== i) })} className="text-gray-400 hover:text-red-600"><X size={16} /></button>
                  </div>
                ))}
                <button type="button" onClick={() => setForm({ ...form, steps: [...form.steps, { action: "", target: "", expected: "" }] })} className="text-sm text-brand-600">+ Add step</button>
              </div>
            </fieldset>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setForm(null)} className="px-4 py-2 text-sm rounded-xl border border-gray-300">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm rounded-xl bg-brand-600 text-white disabled:opacity-60">{saving ? "Saving…" : "Create"}</button>
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
                <li key={s.order}>{s.action}{s.target && <span className="text-gray-400"> → {s.target}</span>}{s.expected && <span className="text-gray-500"> (expect: {s.expected})</span>}</li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}