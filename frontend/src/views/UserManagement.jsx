// Trang Users (/users) – Admin xem danh sách thành viên, tạo / sửa / xoá, đổi vai trò, khoá/mở khoá.
// Backend: GET|POST /users, GET|PATCH|DELETE /users/:id, PATCH /users/:id/role|status (users.routes.js).
import { useState, useEffect, useMemo } from "react";
import { Shield, Lock, UserCheck, Users, Pencil, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../controllers/AuthContext";
import {
  listUsers,
  changeUserRole,
  changeUserStatus,
  createUser,
  updateUser,
  deleteUser,
} from "../services/userService";
import { getErrorMessage } from "../services/authService";
import { parseQuery, buildQuery } from "../models/searchTags";
import CreateButton from "../components/ui/CreateButton";
import FilterBar from "../components/ui/FilterBar";
import FilterMenu from "../components/ui/FilterMenu";
import RowMenu from "../components/ui/RowMenu";

const ROLES = ["admin", "tester", "dev", "viewer"];

const EMPTY = { name: "", email: "", password: "", role: "viewer", status: "active" };
const inputCls =
  "w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50";
const labelCls = "block text-xs font-semibold text-gray-600 mb-1";

// Tag của riêng trang Users. Backend có nhận ?role=/?status= nhưng vẫn lọc hai nhóm này ở
// client: đổi tag không phải gọi lại API. Chỉ free text đi lên ?q=.
const GROUPS = [
  { key: "role", label: "Role", allLabel: "All roles", options: ROLES },
  {
    key: "status",
    label: "Status",
    allLabel: "All status",
    options: [
      { value: "active", label: "active" },
      { value: "inactive", label: "inactive" },
    ],
  },
];

export default function UserManagement() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [busyId, setBusyId] = useState(null);
  const [form, setForm] = useState(null); // null = modal đóng; có .id = đang sửa
  const [toDelete, setToDelete] = useState(null);
  const [saving, setSaving] = useState(false);

  // Ô search là nguồn sự thật duy nhất: tag nằm trong chuỗi `q`, filter suy ra từ nó.
  const { filters, text } = useMemo(() => parseQuery(q, GROUPS), [q]);

  const shown = useMemo(
    () =>
      users.filter(
        (u) =>
          (filters.role.length === 0 || filters.role.includes(u.role)) &&
          (filters.status.length === 0 || filters.status.includes(u.status)),
      ),
    [users, filters],
  );

  // GET /users?q= (tìm sau 300ms ngừng gõ)
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const list = await listUsers({ q: text.trim() || undefined });
        if (!cancelled) setUsers(list);
      } catch (err) {
        if (!cancelled) toast.error(getErrorMessage(err, "Cannot load users."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [text, reloadKey]);

  const refresh = () => setReloadKey((k) => k + 1);

  // Dòng đổi được hay không: backend từ chối tài khoản admin (409 ADMIN_PROTECTED) và
  // từ chối tự sửa chính mình (400). Ẩn nút ở hai trường hợp đó thay vì để người dùng bấm rồi lỗi.
  const locked = (u) => u.role === "admin" || String(u.id) === String(me?.id);

  const apply = async (u, fn) => {
    setBusyId(u.id);
    try {
      const saved = await fn();
      setUsers((list) => list.map((x) => (x.id === saved.id ? saved : x)));
      toast.success(`Updated ${saved.email}.`);
    } catch (err) {
      toast.error(getErrorMessage(err, "Cannot update this user."));
    } finally {
      setBusyId(null);
    }
  };

  const handleRoleChange = (u, role) =>
    apply(u, () => changeUserRole(u.id, role));

  const handleToggleLock = (u) =>
    apply(u, () => changeUserStatus(u.id, u.status === "active" ? "inactive" : "active"));

  // Tạo: POST /users (vai trò + trạng thái chọn được). Sửa: PATCH /users/:id (chỉ tên + email).
  const handleSave = async (e) => {
    e.preventDefault();
    const name = form.name.trim();
    const email = form.email.trim();
    if (name.length < 2) return toast.error("Full name is too short.");
    if (!email) return toast.error("Email is required.");
    if (!form.id && form.password.length < 6)
      return toast.error("Password must be at least 6 characters.");

    setSaving(true);
    try {
      if (form.id) {
        await updateUser(form.id, { name, email });
        toast.success("User updated.");
      } else {
        await createUser({ ...form, name, email });
        toast.success(`Created ${email}.`);
      }
      setForm(null);
      refresh();
    } catch (err) {
      toast.error(getErrorMessage(err, "Cannot save this user."));
    } finally {
      setSaving(false);
    }
  };

  // Xoá hẳn: lịch sử chạy test vẫn còn nhưng mất tên người chạy (FK ON DELETE SET NULL).
  const handleDelete = async () => {
    setSaving(true);
    try {
      await deleteUser(toDelete.id);
      toast.success(`Deleted ${toDelete.email}.`);
      setToDelete(null);
      refresh();
    } catch (err) {
      toast.error(getErrorMessage(err, "Cannot delete this user."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-screen-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage user permissions, access control, and account status.
          </p>
        </div>
        <CreateButton onClick={() => setForm({ ...EMPTY })} />
      </div>

      <FilterBar
        value={q}
        onChange={setQ}
        placeholder="Search name / email, or pick a tag"
        onRefresh={refresh}
        loading={loading}
        tagGroups={GROUPS}
      >
        <FilterMenu
          groups={GROUPS}
          value={filters}
          onChange={(next) => setQ(buildQuery(next, text, GROUPS))}
        />
      </FilterBar>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <Users size={18} className="text-brand-600" /> System Users Control
          </h3>
          <span className="text-xs text-gray-400 font-medium">
            {shown.length} / {users.length} users
          </span>
        </div>

        <div className="max-h-[450px] overflow-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-gray-50 shadow-sm">
              <tr className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider border-b border-gray-100">
                <th className="py-3.5 px-6">Name &amp; Email</th>
                <th className="py-3.5 px-6">Role Assignment</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && users.length === 0 && (
                <tr><td colSpan={4} className="py-10 text-center text-gray-400">Loading…</td></tr>
              )}
              {!loading && shown.length === 0 && (
                <tr><td colSpan={4} className="py-10 text-center text-gray-400">No users found.</td></tr>
              )}
              {shown.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50/50 transition">
                  <td className="py-4 px-6">
                    <p className="font-semibold text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </td>
                  <td className="py-4 px-6">
                    <div className="inline-flex items-center gap-1.5">
                      <Shield size={14} className="text-brand-600" />
                      {locked(user) ? (
                        <span className="px-3 py-1.5 text-xs font-semibold text-gray-700 capitalize">
                          {user.role}
                        </span>
                      ) : (
                        <select
                          value={user.role}
                          disabled={busyId === user.id}
                          onChange={(e) => handleRoleChange(user, e.target.value)}
                          className="px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 capitalize focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:opacity-60"
                        >
                          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        user.status === "active"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {user.status === "active" ? <UserCheck size={12} /> : <Lock size={12} />}
                      {user.status === "active" ? "Active" : "Locked"}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-end gap-1">
                      {locked(user) ? (
                        <span className="text-xs text-gray-400 mr-1">
                          {user.role === "admin" ? "" : "This is you"}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleToggleLock(user)}
                          disabled={busyId === user.id}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition duration-200 border shadow-sm disabled:opacity-60 ${
                            user.status === "active"
                              ? "bg-white hover:bg-red-50 text-red-600 border-gray-200 hover:border-red-200"
                              : "bg-white hover:bg-emerald-50 text-emerald-600 border-gray-200 hover:border-emerald-200"
                          }`}
                        >
                          {user.status === "active" ? "Lock Account" : "Unlock Account"}
                        </button>
                      )}

                      {/* Sửa tên / email: backend cho sửa cả admin và chính mình */}
                      <button
                        onClick={() => setForm({ ...EMPTY, id: user.id, name: user.name, email: user.email })}
                        title="Edit name / email"
                        className="p-2 text-gray-500 hover:text-brand-600"
                      >
                        <Pencil size={16} />
                      </button>

                      {/* Xoá: backend từ chối tài khoản admin (409) và tự xoá mình (400) */}
                      {!locked(user) && (
                        <RowMenu
                          items={[
                            { label: "Delete", icon: Trash2, onClick: () => setToDelete(user), danger: true },
                          ]}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: tạo / sửa */}
      {form && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleSave}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">{form.id ? "Edit User" : "Create User"}</h3>
              <button type="button" onClick={() => setForm(null)} className="text-gray-400 hover:text-gray-700">
                <X size={18} />
              </button>
            </div>

            <fieldset disabled={saving} className="space-y-4">
              <div>
                <label className={labelCls}>Full name <span className="text-red-500">*</span></label>
                <input
                  aria-label="Full name"
                  className={inputCls}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div>
                <label className={labelCls}>Email <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  aria-label="Email"
                  className={inputCls}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>

              {/* Mật khẩu chỉ đặt lúc tạo; chưa có endpoint đổi mật khẩu cho người khác. */}
              {!form.id && (
                <>
                  <div>
                    <label className={labelCls}>Password <span className="text-red-500">*</span></label>
                    <input
                      type="password"
                      aria-label="Password"
                      autoComplete="new-password"
                      className={inputCls}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      At least 6 characters. Share it with the user — they cannot reset it yet.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Role</label>
                      <select
                        aria-label="Role"
                        className={inputCls}
                        value={form.role}
                        onChange={(e) => setForm({ ...form, role: e.target.value })}
                      >
                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Status</label>
                      <select
                        aria-label="Status"
                        className={inputCls}
                        value={form.status}
                        onChange={(e) => setForm({ ...form, status: e.target.value })}
                      >
                        <option value="active">active</option>
                        <option value="inactive">inactive</option>
                      </select>
                    </div>
                  </div>
                  {form.role === "admin" && (
                    <p className="text-xs text-amber-600">
                      An admin account cannot be demoted, locked or deleted from this page afterwards.
                    </p>
                  )}
                </>
              )}
            </fieldset>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setForm(null)}
                disabled={saving}
                className="px-4 py-2 border border-gray-200 rounded-xl text-sm disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold disabled:opacity-60"
              >
                {saving ? "Saving…" : form.id ? "Save" : "Create"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: xác nhận xoá */}
      {toDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-bold">Delete user?</h3>
            <p className="text-sm text-gray-600">
              <strong>{toDelete.email}</strong> will be removed for good. Past runs keep their
              history but lose the tester name. Locking the account instead keeps it intact.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setToDelete(null)}
                disabled={saving}
                className="px-4 py-2 border border-gray-200 rounded-xl text-sm disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold disabled:opacity-60"
              >
                {saving ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
