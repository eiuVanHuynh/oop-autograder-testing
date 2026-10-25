import { useState } from "react";
import { Plus, Pencil, Trash2, X, FileText } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../controllers/AuthContext";
import { canManageTemplates } from "../models/permissions";
import {
  listTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from "../services/templateService";
import { getErrorMessage } from "../services/authService";

// Form theo bảng test_templates (api-endpoints.md mục 4): tên, mô tả, phạm vi, test sẽ chạy (target_json),
// môi trường + timeout mặc định. Không còn "Yêu cầu test" / "Expected Output" (API không có).
// BACKEND-TODO: ô "Test codes" nhập tay (TC-01, TC-02). Khi có GET /cases và GET /suites (mục 9)
//   thì đổi thành bộ chọn test / chọn suite để tạo target_json.
const EMPTY = {
  name: "",
  description: "",
  scope: "API",
  testCodes: "",
  defaultEnv: "development",
  timeoutSec: "30",
};
const SCOPES = ["UI", "API", "DB"];
const inputCls =
  "w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500";

export default function Templates() {
  const { user } = useAuth();
  const canEdit = canManageTemplates(user?.role);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null); // null = đóng; { id?, ...fields }
  const [toDelete, setToDelete] = useState(null);

  // GET /templates
  const refresh = async () => {
    try {
      setTemplates(await listTemplates());
    } catch (err) {
      toast.error(getErrorMessage(err, "Không tải được danh sách template."));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    refresh();
  }, []);
  // Template -> giá trị form (mili-giây -> giây, mảng test -> chuỗi)
  const toForm = (t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    scope: t.scope,
    testCodes: t.targetTestIds.join(", "),
    defaultEnv: t.defaultEnv || "development",
    timeoutSec: String((t.defaultTimeoutMs || 30000) / 1000),
  });

  const handleSave = async (e) => {
    e.preventDefault();
    if (!canEdit)
      return toast.error("Bạn không có quyền thực hiện thao tác này.");
    const testIds = form.testCodes
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    if (!form.name.trim()) return toast.error("Vui lòng nhập Tên template.");
    if (testIds.length === 0)
      return toast.error("Template phải có ít nhất một test (target_json).");
    const data = {
      name: form.name.trim(),
      description: form.description,
      scope: form.scope,
      targetTestIds: testIds,
      defaultEnv: form.defaultEnv,
      defaultTimeoutMs: Number(form.timeoutSec) * 1000, // form dùng giây, backend dùng mili-giây
    };
    try {
      if (form.id) {
        await updateTemplate(form.id, data); // PUT /templates/:id
        toast.success("Đã cập nhật template.");
      } else {
        await createTemplate(data); // POST /templates (409 nếu trùng tên)
        toast.success("Đã thêm template.");
      }
      setForm(null);
      refresh();
    } catch (err) {
      toast.error(getErrorMessage(err, "Không lưu được template."));
    }
  };

  const handleDelete = async () => {
    if (!canEdit)
      return toast.error("Bạn không có quyền thực hiện thao tác này.");
    try {
      await deleteTemplate(toDelete.id); // DELETE /templates/:id
      toast.success("Đã xóa template.");
      setToDelete(null);
      refresh();
    } catch (err) {
      toast.error(getErrorMessage(err, "Không xóa được template."));
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Template</h1>
          <p className="text-sm text-gray-500 mt-1">
            {canEdit
              ? "Tạo và chỉnh sửa các mẫu test dùng lại."
              : "Bạn chỉ có quyền xem template."}
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => setForm({ ...EMPTY })}
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl text-sm shadow-lg shadow-purple-500/20 flex items-center gap-2"
          >
            <Plus size={16} /> Thêm Template
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {templates.length === 0 ? (
          <div className="text-center py-14 text-gray-400">
            <FileText size={40} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">Chưa có template nào.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="text-left px-5 py-3">Tên</th>
                <th className="text-left px-5 py-3">Phạm vi</th>
                <th className="text-left px-5 py-3">Người tạo</th>
                <th className="text-left px-5 py-3">Cập nhật</th>
                {canEdit && <th className="px-5 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {templates.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-500 truncate max-w-md">
                      {t.requirements}
                    </p>
                  </td>
                  <td className="px-5 py-3">
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                      {t.scope}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{t.createdBy}</td>
                  <td className="px-5 py-3 text-gray-600">{t.updatedAt}</td>
                  {canEdit && (
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => setForm({ ...t })}
                        className="p-2 text-gray-500 hover:text-purple-600"
                        title="Sửa"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => setToDelete(t)}
                        className="p-2 text-gray-500 hover:text-red-600"
                        title="Xóa"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {form && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleSave}
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">
                {form.id ? "Sửa Template" : "Thêm Template"}
              </h3>
              <button
                type="button"
                onClick={() => setForm(null)}
                className="text-gray-400 hover:text-gray-700"
              >
                <X size={18} />
              </button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Tên template *
              </label>
              <input
                className={inputCls}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Yêu cầu test *
              </label>
              <textarea
                rows={3}
                className={inputCls}
                value={form.requirements}
                onChange={(e) =>
                  setForm({ ...form, requirements: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Phạm vi
                </label>
                <select
                  className={inputCls}
                  value={form.scope}
                  onChange={(e) => setForm({ ...form, scope: e.target.value })}
                >
                  {SCOPES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Expected Output
                </label>
                <input
                  className={inputCls}
                  value={form.expectedOutput}
                  onChange={(e) =>
                    setForm({ ...form, expectedOutput: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Phạm vi
                  </label>
                  <select
                    className={inputCls}
                    value={form.scope}
                    onChange={(e) =>
                      setForm({ ...form, scope: e.target.value })
                    }
                  >
                    {SCOPES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  {/* BACKEND-TODO: danh sách môi trường nên lấy từ GET /meta/options */}
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Môi trường
                  </label>
                  <input
                    className={inputCls}
                    value={form.defaultEnv}
                    onChange={(e) =>
                      setForm({ ...form, defaultEnv: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Timeout (giây)
                  </label>
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
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setForm(null)}
                className="px-4 py-2 border border-gray-200 rounded-xl text-sm"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold"
              >
                Lưu
              </button>
            </div>
          </form>
        </div>
      )}

      {toDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-bold">Xóa template?</h3>
            <p className="text-sm text-gray-600">
              Template <strong>{toDelete.name}</strong> sẽ bị xóa vĩnh viễn.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setToDelete(null)}
                className="px-4 py-2 border border-gray-200 rounded-xl text-sm"
              >
                Hủy
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
