// Trang Users (/users) – Admin xem danh sách thành viên, đổi vai trò, khoá/mở khoá.
// Backend: GET /users, PATCH /users/:id/role, PATCH /users/:id/status (users.routes.js).
import { useState, useEffect } from "react";
import { Shield, Lock, UserCheck, Users } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../controllers/AuthContext";
import { listUsers, changeUserRole, changeUserStatus } from "../services/userService";
import { getErrorMessage } from "../services/authService";
import FilterBar from "../components/ui/FilterBar";

const ROLES = ["admin", "tester", "dev", "viewer"];

export default function UserManagement() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [busyId, setBusyId] = useState(null);

  // GET /users?q= (tìm sau 300ms ngừng gõ)
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const list = await listUsers({ q: q.trim() || undefined });
        if (!cancelled) setUsers(list);
      } catch (err) {
        if (!cancelled) toast.error(getErrorMessage(err, "Cannot load users."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [q, reloadKey]);

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

  return (
    <div className="max-w-screen-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage user permissions, access control, and account status.
        </p>
      </div>

      <FilterBar
        value={q}
        onChange={setQ}
        placeholder="Search name / email"
        onRefresh={refresh}
        loading={loading}
      />

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <Users size={18} className="text-brand-600" /> System Users Control
          </h3>
          <span className="text-xs text-gray-400 font-medium">
            {users.length} users registered
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
              {!loading && users.length === 0 && (
                <tr><td colSpan={4} className="py-10 text-center text-gray-400">No users found.</td></tr>
              )}
              {users.map((user) => (
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
                  <td className="py-4 px-6 text-right">
                    {locked(user) ? (
                      <span className="text-xs text-gray-400">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
