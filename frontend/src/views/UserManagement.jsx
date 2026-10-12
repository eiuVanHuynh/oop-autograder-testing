import { useState } from 'react';
import { Shield, Lock, Unlock, UserCheck, Users } from 'lucide-react';
import toast from 'react-hot-toast';

export default function UserManagement() {
  const [users, setUsers] = useState([
    { id: 1, name: 'Nguyễn Văn A', email: 'admin@test.com', role: 'Admin', status: 'Active' },
    { id: 2, name: 'Trần Thị B', email: 'tester@test.com', role: 'Tester', status: 'Active' },
    { id: 3, name: 'Lê Văn C', email: 'dev@test.com', role: 'Dev', status: 'Active' },
    { id: 4, name: 'Phạm Thị D', email: 'viewer@test.com', role: 'Viewer', status: 'Locked' },
  ]);

  const handleRoleChange = (userId, newRole) => {
    setUsers(users.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
    toast.success(`Updated role to ${newRole} successfully!`);
  };

  const handleToggleLock = (userId) => {
    setUsers(
      users.map((u) => {
        if (u.id === userId) {
          const nextStatus = u.status === 'Active' ? 'Locked' : 'Active';
          toast.success(`User status changed to ${nextStatus}`);
          return { ...u, status: nextStatus };
        }
        return u;
      })
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage user permissions, access control, and account status.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <Users size={18} className="text-purple-600" /> System Users Control
          </h3>
          <span className="text-xs text-gray-400 font-medium">{users.length} users registered</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider border-b border-gray-100">
                <th className="py-3.5 px-6">Name & Email</th>
                <th className="py-3.5 px-6">Role Assignment</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50/50 transition">
                  <td className="py-4 px-6">
                    <p className="font-semibold text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </td>
                  <td className="py-4 px-6">
                    <div className="inline-flex items-center gap-1.5">
                      <Shield size={14} className="text-purple-600" />
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        className="px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      >
                        <option value="Admin">Admin</option>
                        <option value="Tester">Tester</option>
                        <option value="Dev">Dev</option>
                        <option value="Viewer">Viewer</option>
                      </select>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        user.status === 'Active'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {user.status === 'Active' ? <UserCheck size={12} /> : <Lock size={12} />}
                      {user.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button
                      onClick={() => handleToggleLock(user.id)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition duration-200 border shadow-sm ${
                        user.status === 'Active'
                          ? 'bg-white hover:bg-red-50 text-red-600 border-gray-200 hover:border-red-200'
                          : 'bg-white hover:bg-emerald-50 text-emerald-600 border-gray-200 hover:border-emerald-200'
                      }`}
                    >
                      {user.status === 'Active' ? 'Lock Account' : 'Unlock Account'}
                    </button>
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
