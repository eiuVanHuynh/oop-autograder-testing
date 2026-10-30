import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Activity,
  CheckCircle2,
  Loader2,
  XCircle,
  Eye,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../controllers/AuthContext";
import { canRunTest } from "../models/permissions";
import { getRuns, computeStats, dailyPassFail } from "../services/runService";
import { getErrorMessage } from "../services/authService";
import CreateButton from "../components/ui/CreateButton";
const STATUS_STYLE = {
  PASSED: "bg-emerald-100 text-emerald-700",
  FAILED: "bg-red-100 text-red-700",
  RUNNING: "bg-amber-100 text-amber-700",
  INTERRUPTED: "bg-orange-100 text-orange-700",
};
export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // GET /runs lỗi thì vẫn phải thoát trạng thái loading, nếu không trang treo ở "Loading…".
    getRuns()
      .then(setRuns)
      .catch((e) => toast.error(getErrorMessage(e, "Cannot load test runs.")))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => computeStats(runs), [runs]);
  const chartData = useMemo(() => dailyPassFail(runs, 7), [runs]);
  const recent = runs.slice(0, 8);

  const cards = [
    {
      label: "Total Runs",
      value: stats.total,
      icon: Activity,
      color: "text-brand-600 bg-brand-100",
    },
    {
      label: "Pass Rate",
      value: `${stats.passRate}%`,
      icon: CheckCircle2,
      color: "text-emerald-600 bg-emerald-100",
    },
    {
      label: "Running",
      value: stats.running,
      icon: Loader2,
      color: "text-amber-600 bg-amber-100",
    },
    {
      label: "Latest Failed",
      value: stats.lastFailed ? `#${stats.lastFailed.id}` : "—",
      sub: stats.lastFailed?.name,
      icon: XCircle,
      color: "text-red-600 bg-red-100",
      onClick: stats.lastFailed
        ? () => navigate(`/runs/${stats.lastFailed.id}`)
        : undefined,
    },
  ];

  if (loading)
    return <p className="text-sm text-gray-500">Loading dashboard...</p>;

  return (
    <div className="max-w-screen-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Automated Testing Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Overview of test activity over the last 7 days.
          </p>
        </div>
        {canRunTest(user?.role) && (
          <CreateButton onClick={() => navigate("/tests/new")} />
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map(({ label, value, sub, icon: Icon, color, onClick }) => (
          <div
            key={label}
            onClick={onClick}
            className={`bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex items-center gap-4 ${onClick ? "cursor-pointer hover:border-red-300" : ""}`}
          >
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}
            >
              <Icon size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 font-medium">{label}</p>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              {sub && <p className="text-xs text-gray-400 truncate">{sub}</p>}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-base font-semibold text-gray-800 mb-4">
          Pass / Fail theo ngày
        </h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Pass" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Fail" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-800">
            Recent test runs
          </h3>
          <button
            onClick={() => navigate("/history")}
            className="text-xs text-brand-600 font-medium hover:underline"
          >
            View all
          </button>
        </div>
        <div className="max-h-[400px] overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="text-left px-5 py-3">ID</th>
                <th className="text-left px-5 py-3">Name</th>
                <th className="text-left px-5 py-3">Run by</th>
                <th className="text-left px-5 py-3">Executed at</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recent.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-mono text-gray-500">#{r.id}</td>
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {r.name}
                  </td>
                  <td className="px-5 py-3 text-gray-600">{r.runBy}</td>
                  <td className="px-5 py-3 text-gray-600">{r.executedAt}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLE[r.status] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => navigate(`/runs/${r.id}`)}
                      className="px-3 py-1.5 border border-gray-200 hover:border-brand-600 hover:text-brand-600 rounded-lg text-xs font-medium inline-flex items-center gap-1"
                    >
                      <Eye size={14} /> Report
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
