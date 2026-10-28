// Trang Quản lý Template (/templates) – theo docs/frontend/design/08-template-management.png
// và docs/backend/api-endpoints.md mục 4.

import { useState, useEffect, useRef } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  X,
  FileText,
  Search,
  RefreshCw,
  Copy,
  ChevronDown,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../controllers/AuthContext";
import { canManageTemplates } from "../models/permissions";
import { ENVIRONMENTS, SCOPES } from "../models/options";
import {
  listTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
} from "../services/templateService";
import { getErrorMessage } from "../services/authService";

const EMPTY = {
  name: "",
  description: "",
  scope: "API",
  testCodes: "",
  suiteId: null,
  defaultEnv: "development",
  timeoutSec: "30",
};
const inputCls =
  "w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50 disabled:text-gray-600";
const labelCls = "block text-xs font-semibold text-gray-600 mb-1";

// Template (từ API) -> giá trị form. mili-giây -> giây, mảng test -> chuỗi.
const toForm = (t, readOnly = false) => ({
  id: t.id,
  name: t.name,
  description: t.description,
  scope: t.scope,
  testCodes: t.targetTestIds ? t.targetTestIds.join(", ") : "",
  suiteId: t.suiteId,
  defaultEnv: t.defaultEnv || "development",
  timeoutSec: String((t.defaultTimeoutMs || 30000) / 1000),
  readOnly,
});

const tplCode = (id) => `TPL-${String(id).padStart(4, "0")}`;

// ==========================================
// COMPONENT CUSTOM DROPDOWN CÓ Ô SEARCH
// ==========================================
function SearchableScopeSelect({
  value,
  onChange,
  options = SCOPES,
  placeholder = "All Scopes",
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef(null);

  // Lọc danh sách từ mảng options
  const filteredOptions = (options || []).filter((s) =>
    String(s).toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Đóng dropdown khi click ngoài vùng
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Nút bấm giả lập Select Box */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!isOpen) setSearchQuery("");
          setIsOpen(!isOpen);
        }}
        className={`${inputCls} flex items-center justify-between text-left bg-white cursor-pointer select-none`}
      >
        <span
          className={
            value ? "text-gray-900 font-medium truncate" : "text-gray-400"
          }
        >
          {value || placeholder}
        </span>
        <ChevronDown size={16} className="text-gray-400 shrink-0 ml-1" />
      </button>

      {/* Menu xổ xuống chứa Ô Search + Danh Sách */}
      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 p-2 space-y-2">
          {/* Ô Input Tìm Kiếm */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search scope..."
              className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 text-gray-900"
            />
          </div>

          {/* Danh sách các Option */}
          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {placeholder === "All Scopes" && (
              <div
                onClick={() => {
                  onChange("");
                  setIsOpen(false);
                  setSearchQuery("");
                }}
                className="px-3 py-2 text-xs text-gray-500 hover:bg-gray-100 rounded-lg cursor-pointer"
              >
                -- All Scopes --
              </div>
            )}

            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-xs text-gray-400 text-center">
                No scopes found
              </div>
            ) : (
              filteredOptions.map((s) => (
                <div
                  key={s}
                  onClick={() => {
                    onChange(s);
                    setIsOpen(false);
                    setSearchQuery("");
                  }}
                  className={`px-3 py-2 text-xs rounded-lg cursor-pointer transition ${
                    value === s
                      ? "bg-brand-50 text-brand-600 font-semibold"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {s}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Templates() {
  const { user } = useAuth();
  const canEdit = canManageTemplates(user?.role);

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [scope, setScope] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [form, setForm] = useState(null); // null = đóng
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  // GET /templates?q=&scope= (tìm sau 300ms ngừng gõ)
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const list = await listTemplates({
          q: q.trim() || undefined,
          scope: scope || undefined,
        });
        if (!cancelled) setTemplates(list);
      } catch (err) {
        if (!cancelled)
          toast.error(getErrorMessage(err, "Cannot load templates."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q, scope, reloadKey]);

  const refresh = () => setReloadKey((k) => k + 1);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!canEdit) return toast.error("You do not have permission.");
    const name = form.name.trim();
    const testIds = form.testCodes
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    const timeoutSec = Number(form.timeoutSec);
    if (name.length < 2) return toast.error("Template name is too short.");
    if (!form.suiteId && testIds.length === 0)
      return toast.error("Add at least one test code.");
    if (!(timeoutSec > 0)) return toast.error("Timeout must be positive.");

    const data = {
      name,
      description: form.description,
      scope: form.scope,
      suiteId: form.suiteId,
      targetTestIds: testIds,
      defaultEnv: form.defaultEnv,
      defaultTimeoutMs: Math.round(timeoutSec * 1000), // form dùng giây, backend dùng mili-giây
    };

    setSaving(true);
    try {
      if (form.id) {
        await updateTemplate(form.id, data); // PUT /templates/:id
        toast.success("Template updated.");
      } else {
        await createTemplate(data); // POST /templates (409 nếu trùng tên)
        toast.success("Template created.");
      }
      setForm(null);
      refresh();
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

  const handleDelete = async () => {
    if (!canEdit) return toast.error("You do not have permission.");
    try {
      await deleteTemplate(toDelete.id); // DELETE /templates/:id (204)
      toast.success("Template deleted.");
      setToDelete(null);
      refresh();
    } catch (err) {
      toast.error(getErrorMessage(err, "Cannot delete the template."));
    }
  };

  const handleDuplicate = async (t) => {
    if (!canEdit) return toast.error("You do not have permission.");
    try {
      await duplicateTemplate(t.id); // POST /templates/:id/duplicate (201)
      toast.success("Template duplicated.");
      refresh();
    } catch (err) {
      toast.error(getErrorMessage(err, "Cannot duplicate the template."));
    }
  };

  const readOnly = !!form?.readOnly;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Template Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {canEdit
              ? "Create, organize, and reuse test configurations."
              : "You have read-only access to templates."}
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => setForm({ ...EMPTY })}
            className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl text-sm shadow-lg shadow-brand-500/20 flex items-center gap-2 shrink-0"
          >
            <Plus size={16} /> Create Template
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search templates by name..."
            className={`${inputCls} pl-9`}
          />
        </div>

        {/* Tích hợp Searchable Scope Select ở Filter Bar */}
        <div className="w-48">
          <SearchableScopeSelect
            value={scope}
            onChange={setScope}
            placeholder="All Scopes"
          />
        </div>

        <button
          type="button"
          onClick={refresh}
          title="Refresh"
          className="p-2.5 text-gray-500 hover:text-brand-600 border border-gray-200 rounded-xl"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {!loading && templates.length === 0 ? (
          <div className="text-center py-14 text-gray-400">
            <FileText size={40} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No templates found.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="text-left px-5 py-3">
                  Template name & description
                </th>
                <th className="text-left px-5 py-3">Test scope</th>
                <th className="text-left px-5 py-3">Created by</th>
                <th className="text-left px-5 py-3">Last updated</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && templates.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-8 text-center text-gray-400"
                  >
                    Loading...
                  </td>
                </tr>
              )}
              {templates.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <button
                      onClick={() => setForm(toForm(t, !canEdit))}
                      className="font-medium text-gray-900 hover:text-brand-600 text-left block"
                    >
                      {t.name}
                    </button>
                    <p className="text-xs text-gray-500 truncate max-w-md">
                      {t.description || "No description"}
                    </p>
                    <p className="text-xs text-gray-400 font-mono">
                      ID: {tplCode(t.id)}
                    </p>
                  </td>
                  <td className="px-5 py-3">
                    <span className="px-2 py-0.5 bg-brand-50 text-brand-600 rounded text-xs font-medium">
                      {t.scope}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    User #{t.createdBy}
                  </td>
                  <td className="px-5 py-3 text-gray-600">{t.updatedAt}</td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    {canEdit ? (
                      <>
                        <button
                          onClick={() => handleDuplicate(t)}
                          className="p-2 text-gray-500 hover:text-brand-600"
                          title="Duplicate"
                        >
                          <Copy size={16} />
                        </button>
                        <button
                          onClick={() => setForm(toForm(t))}
                          className="p-2 text-gray-500 hover:text-brand-600"
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => setToDelete(t)}
                          className="p-2 text-gray-500 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setForm(toForm(t, true))}
                        className="p-2 text-gray-500 hover:text-brand-600"
                        title="View"
                      >
                        <Eye size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal: tạo / sửa / xem */}
      {form && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleSave}
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">
                {readOnly
                  ? "Template details"
                  : form.id
                    ? "Edit Template"
                    : "Create Template"}
              </h3>
              <button
                type="button"
                onClick={() => setForm(null)}
                className="text-gray-400 hover:text-gray-700"
              >
                <X size={18} />
              </button>
            </div>

            <fieldset disabled={readOnly || saving} className="space-y-4">
              <div>
                <label className={labelCls}>Template name *</label>
                <input
                  className={inputCls}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div>
                <label className={labelCls}>Description</label>
                <textarea
                  rows={3}
                  className={inputCls}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </div>

              <div>
                <label className={labelCls}>Tests to run *</label>
                {form.suiteId ? (
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-xl px-3 py-2">
                    Suite #{form.suiteId}
                  </p>
                ) : (
                  <>
                    <input
                      className={inputCls}
                      placeholder="TC-01, TC-02"
                      value={form.testCodes}
                      onChange={(e) =>
                        setForm({ ...form, testCodes: e.target.value })
                      }
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Separate test codes with commas.
                    </p>
                  </>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Scope</label>
                  {/* Tích hợp Searchable Scope Select ở Modal */}
                  <SearchableScopeSelect
                    value={form.scope}
                    disabled={readOnly || saving}
                    onChange={(val) =>
                      setForm({ ...form, scope: val || "API" })
                    }
                    placeholder="Select scope"
                  />
                </div>
                <div>
                  <label className={labelCls}>Environment</label>
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
                </div>
                <div>
                  <label className={labelCls}>Timeout (s)</label>
                  <input
                    type="number"
                    min="1"
                    className={inputCls}
                    value={form.timeoutSec}
                    onChange={(e) =>
                      setForm({ ...form, timeoutSec: e.target.value })
                    }
                  />
                </div>
              </div>
            </fieldset>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setForm(null)}
                className="px-4 py-2 border border-gray-200 rounded-xl text-sm"
              >
                {readOnly ? "Close" : "Cancel"}
              </button>
              {!readOnly && (
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Modal: xác nhận xóa */}
      {toDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-bold">Delete template?</h3>
            <p className="text-sm text-gray-600">
              <strong>{toDelete.name}</strong> will be deleted. Past runs keep
              their history.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setToDelete(null)}
                className="px-4 py-2 border border-gray-200 rounded-xl text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
