// Trang Tạo / Sửa / Xem Template — thay cho modal cũ trong views/Templates.jsx:
//   /templates/new        tạo mới
//   /templates/:id/edit   sửa
//   /templates/:id        XEM (chỉ đọc, mọi vai trò)
//
// Bố cục và phong cách bám theo views/TestCaseForm.jsx: PageHeader + các Section đánh số ở cột
// trái, cột phải cố định là danh sách "đã đủ chưa" cùng nút Lưu. Hai trang làm việc giống nhau
// (khai báo một thứ rồi lưu) nên dùng chung một khuôn, người dùng không phải học lại.
//
// Hợp đồng với backend không đổi so với modal cũ: POST /templates, PUT /templates/:id
// (services/templateService.js). target_json nhận suiteId HOẶC testIds — testIds là danh sách
// CÓ THỨ TỰ, và thứ tự đó chính là thứ tự chạy (issue #67).
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  Circle,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../controllers/AuthContext";
import { canManageTemplates } from "../models/permissions";
import { ENVIRONMENTS, SCOPES } from "../models/options";
import { splitCodes, joinCodes, moveAt } from "../models/caseOrder";
import {
  getTemplate,
  createTemplate,
  updateTemplate,
} from "../services/templateService";
import { listCases, listSuites } from "../services/catalogService";
import { getErrorMessage } from "../services/authService";
import PageHeader from "../components/ui/PageHeader";

const inputCls =
  "w-full h-10 px-3 bg-white border border-gray-300 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50 disabled:text-gray-400";
const areaCls = inputCls.replace("h-10 ", "py-2 ");

const EMPTY = {
  name: "",
  description: "",
  scope: "API",
  testCodes: "",
  suiteId: null,
  defaultEnv: "development",
  timeoutSec: "30",
  status: "active",
};

// Template (từ API) -> giá trị form. mili-giây -> giây, mảng test -> chuỗi có thứ tự.
const toForm = (t) => ({
  name: t.name,
  description: t.description ?? "",
  scope: t.scope,
  testCodes: t.targetTestIds ? joinCodes(t.targetTestIds) : "",
  suiteId: t.suiteId,
  defaultEnv: t.defaultEnv || "development",
  timeoutSec: String((t.defaultTimeoutMs || 30000) / 1000),
  status: t.status ?? "active",
});

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

// Một trường của form. Mặc định nhãn BỌC ô nhập, nên bấm vào chữ là con trỏ nhảy vào ô và
// trình đọc màn hình đọc đúng cặp nhãn/ô. `group` dành cho khối có nhiều nút (danh sách thứ tự):
// một <label> không được trỏ tới nhiều control, nên ở đó dùng <div> + tiêu đề thường.
function Field({ label, required, hint, children, className = "", group = false }) {
  const Tag = group ? "div" : "label";
  return (
    <Tag className={`block ${className}`}>
      <span className="mb-1 block text-sm font-medium text-gray-800">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
      {hint && <p className="m-0 mt-1 text-xs text-gray-500">{hint}</p>}
    </Tag>
  );
}

// Chọn test case VÀ xếp thứ tự chạy (issue #67). Mỗi mục là một thẻ có số tròn ở đầu và cụm
// nút lên / xuống / bỏ ở cuối, đúng như danh sách Steps của TestCaseForm; phần thêm nằm dưới,
// ngoài danh sách, giống nút "Add step".
function OrderedCasePicker({ codes, cases, disabled = false, onChange }) {
  const byCode = new Map(cases.map((c) => [c.code, c]));
  const drop = (code) => onChange(codes.filter((x) => x !== code));

  // Một case đã chọn rồi bị chuyển sang 'deprecated' không còn trong `cases`: vẫn phải hiện ra,
  // nếu không người dùng không thấy nó để bỏ đi.
  const picked = codes.map(
    (code) => byCode.get(code) ?? { id: code, code, title: "" },
  );
  const rest = cases.filter((c) => !codes.includes(c.code));

  return (
    <div className="space-y-3">
      {picked.length === 0 ? (
        <p className="m-0 text-sm text-gray-500">
          {cases.length === 0
            ? "No ready test cases yet."
            : disabled
              ? "No test case picked."
              : "No test case picked yet — add one below."}
        </p>
      ) : (
        <ol className="m-0 list-none space-y-2 p-0">
          {picked.map((c, i) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-gray-50/60 p-3"
            >
              <span className="w-4 shrink-0 text-right text-xs tabular-nums text-gray-400">
                {i + 1}
              </span>
              <span className="shrink-0 rounded-md bg-brand-50 px-1.5 py-0.5 font-mono text-xs font-semibold text-brand-700">
                {c.code}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-gray-600">
                {c.title}
              </span>
              {!disabled && (
                <div className="flex items-center text-gray-400">
                  <button
                    type="button"
                    title="Move up"
                    disabled={i === 0}
                    onClick={() => onChange(moveAt(codes, i, i - 1))}
                    className="p-1.5 hover:text-gray-700 disabled:opacity-30"
                  >
                    <ArrowUp size={15} />
                  </button>
                  <button
                    type="button"
                    title="Move down"
                    disabled={i === picked.length - 1}
                    onClick={() => onChange(moveAt(codes, i, i + 1))}
                    className="p-1.5 hover:text-gray-700 disabled:opacity-30"
                  >
                    <ArrowDown size={15} />
                  </button>
                  <button
                    type="button"
                    title="Remove from this template"
                    onClick={() => drop(c.code)}
                    className="p-1.5 hover:text-red-600"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}

      {!disabled && rest.length > 0 && (
        <div className="space-y-1">
          <p className="m-0 text-xs text-gray-500">
            {picked.length > 0 ? "Add another test case:" : "Add a test case:"}
          </p>
          <div className="flex max-h-48 flex-wrap gap-1.5 overflow-y-auto">
            {rest.map((c) => (
              <button
                key={c.id}
                type="button"
                title={c.title}
                onClick={() => onChange([...codes, c.code])}
                className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700 transition hover:border-brand-600 hover:text-brand-600"
              >
                <Plus size={13} className="text-gray-400" />
                <span className="font-mono font-semibold text-brand-700">
                  {c.code}
                </span>
                <span className="max-w-[16rem] truncate text-gray-500">
                  {c.title}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TemplateForm({ mode }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = canManageTemplates(user?.role);

  const viewing = mode === "view";
  const editing = Boolean(id) && !viewing;

  const [form, setForm] = useState(EMPTY);
  const [readyCases, setReadyCases] = useState([]);
  const [suites, setSuites] = useState([]);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listCases({ status: "ready" })
      .then(setReadyCases)
      .catch((e) => toast.error(getErrorMessage(e, "Cannot load test cases.")));
    listSuites()
      .then(setSuites)
      .catch((e) => toast.error(getErrorMessage(e, "Cannot load suites.")));
  }, []);

  useEffect(() => {
    if (!id) return;
    let off = false;
    setLoading(true);
    getTemplate(id)
      .then((t) => !off && setForm(toForm(t)))
      .catch((e) => {
        if (off) return;
        toast.error(getErrorMessage(e, "Cannot load this template."));
        navigate("/templates");
      })
      .finally(() => !off && setLoading(false));
    return () => {
      off = true;
    };
  }, [id, navigate]);

  const codes = useMemo(() => splitCodes(form.testCodes), [form.testCodes]);
  const timeoutSec = Number(form.timeoutSec);

  // Cùng luật với handleSave: một mục xanh nghĩa là phần đó đã đủ để lưu.
  const checks = [
    { ok: form.name.trim().length >= 2, text: "Name is at least 2 characters" },
    {
      ok: Boolean(form.suiteId) || codes.length > 0,
      text: "At least one test case, or a suite",
    },
    { ok: timeoutSec > 0, text: "Timeout is a positive number of seconds" },
  ];
  const saveOk = checks.every((c) => c.ok);

  const handleSave = async (e) => {
    e?.preventDefault();
    if (!canEdit) return toast.error("You do not have permission.");
    const name = form.name.trim();
    if (name.length < 2) return toast.error("Template name is too short.");
    if (!form.suiteId && codes.length === 0)
      return toast.error("Add at least one test case.");
    if (!(timeoutSec > 0))
      return toast.error("Timeout must be a positive number of seconds.");

    const data = {
      name,
      description: form.description,
      scope: form.scope,
      suiteId: form.suiteId,
      targetTestIds: codes, // thứ tự người dùng đã xếp = thứ tự chạy
      defaultEnv: form.defaultEnv,
      defaultTimeoutMs: Math.round(timeoutSec * 1000), // form dùng giây, backend dùng mili-giây
      status: form.status,
    };

    setSaving(true);
    try {
      if (editing) {
        await updateTemplate(id, data); // PUT /templates/:id
        toast.success("Template updated.");
      } else {
        await createTemplate(data); // POST /templates (409 nếu trùng tên)
        toast.success("Template created.");
      }
      navigate("/templates");
    } catch (err) {
      toast.error(
        err.response?.status === 409
          ? "A template with this name already exists."
          : getErrorMessage(err, "Cannot save the template."),
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="p-6 text-sm text-gray-500">Loading template…</p>;
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        breadcrumb={[
          "Templates",
          viewing ? form.name || "Details" : editing ? form.name || "Edit" : "New",
        ]}
        title={
          viewing
            ? "Template Details"
            : editing
              ? "Edit Template"
              : "Create Template"
        }
        description={
          viewing
            ? canEdit
              ? "Read-only. Use Edit to change which tests run and in what order."
              : "You have read-only access to this template."
            : "A template is what people pick on the Run page: which tests run, in which order, and with what settings."
        }
        actions={
          viewing && (
            <>
              <button
                type="button"
                onClick={() => navigate("/templates")}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                <ArrowLeft size={15} /> Back to list
              </button>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => navigate(`/templates/${id}/edit`)}
                  className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700"
                >
                  <Pencil size={15} /> Edit
                </button>
              )}
            </>
          )
        }
      />

      <form
        onSubmit={handleSave}
        className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start"
      >
        {/* ------------------------------- cột trái ------------------------------- */}
        <fieldset
          disabled={viewing || saving}
          className={`m-0 min-w-0 space-y-5 border-0 p-0 ${viewing ? "form-readonly" : ""}`}
        >
          <Section
            n={1}
            title="Basic information"
            hint="What this template is for."
            done={checks[0].ok}
          >
            <Field label="Template name" required>
              <input
                className={inputCls}
                placeholder="Smoke UI"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>

            <Field
              label="Description"
              hint="A line for whoever picks this template on the Run page."
            >
              <textarea
                rows={3}
                className={areaCls}
                placeholder="Login pass; Login fail; Authentication fail"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </Field>
          </Section>

          <Section
            n={2}
            title="Tests to run"
            hint="Either a whole suite, or the test cases you pick — in the order they should run."
            done={checks[1].ok}
          >
            <Field
              label="Suite"
              hint="Pick a suite to run everything 'ready' inside it, or leave it empty and pick test cases below."
            >
              <select
                className={inputCls}
                value={form.suiteId ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    suiteId: e.target.value ? Number(e.target.value) : null,
                  })
                }
              >
                <option value="">— Pick individual tests —</option>
                {suites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.readyCount} ready)
                  </option>
                ))}
              </select>
            </Field>

            {!form.suiteId && (
              <Field
                group
                label="Execution order"
                required
                hint="Runs top to bottom. Use the arrows when one case needs another to run first."
              >
                <OrderedCasePicker
                  codes={codes}
                  cases={readyCases}
                  disabled={viewing || saving}
                  onChange={(next) =>
                    setForm({ ...form, testCodes: joinCodes(next) })
                  }
                />
              </Field>
            )}
          </Section>

          <Section
            n={3}
            title="Run settings"
            hint="Defaults filled in on the Run page; they can still be changed there."
            done={checks[2].ok}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Scope">
                <select
                  className={inputCls}
                  value={form.scope}
                  onChange={(e) => setForm({ ...form, scope: e.target.value })}
                >
                  {SCOPES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Environment">
                <select
                  className={inputCls}
                  value={form.defaultEnv}
                  onChange={(e) =>
                    setForm({ ...form, defaultEnv: e.target.value })
                  }
                >
                  {ENVIRONMENTS.map((env) => (
                    <option key={env.value} value={env.value}>
                      {env.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Timeout (s)" required>
                <input
                  type="number"
                  min="1"
                  className={inputCls}
                  value={form.timeoutSec}
                  onChange={(e) =>
                    setForm({ ...form, timeoutSec: e.target.value })
                  }
                />
              </Field>
            </div>
          </Section>
        </fieldset>

        {/* ------------------------------- cột phải ------------------------------- */}
        <aside className="space-y-4 lg:sticky lg:top-0">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h3 className="m-0 mb-3 text-sm font-semibold text-gray-900">
              {saveOk ? "Ready to save" : "Before it can be saved"}
            </h3>
            <ul className="m-0 list-none space-y-2 p-0">
              {checks.map((c) => (
                <li
                  key={c.text}
                  className={`flex items-start gap-2 text-sm ${c.ok ? "text-gray-700" : "text-gray-500"}`}
                >
                  {c.ok ? (
                    <CheckCircle2
                      size={16}
                      className="mt-0.5 shrink-0 text-green-600"
                    />
                  ) : (
                    <Circle size={16} className="mt-0.5 shrink-0 text-gray-300" />
                  )}
                  {c.text}
                </li>
              ))}
            </ul>
            {form.suiteId && (
              <p className="m-0 mt-3 text-xs text-gray-500">
                This template runs a whole suite, so there is no per-case order.
              </p>
            )}
          </div>

          {!viewing && (
            <div className="space-y-2 rounded-2xl border border-gray-200 bg-white p-5">
              <button
                type="submit"
                disabled={saving || !saveOk || !canEdit}
                title={canEdit ? undefined : "You do not have permission."}
                className="h-10 w-full rounded-lg bg-brand-600 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
              >
                {saving ? "Saving…" : editing ? "Save changes" : "Create template"}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => navigate("/templates")}
                className="h-10 w-full rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          )}
        </aside>
      </form>
    </div>
  );
}
