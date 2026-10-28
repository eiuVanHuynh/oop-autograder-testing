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
  Plus,
} from "lucide-react";
import { useAuth } from "../controllers/AuthContext";
import { canRunTest } from "../models/permissions";
import { getRuns, computeStats, dailyPassFail } from "../services/runService";

const STATUS_STYLE = {
  PASSED: "bg-emerald-100 text-emerald-700",
  FAILED: "bg-red-100 text-red-700",
  RUNNING: "bg-amber-100 text-amber-700",
};
// Component custom dropdown chọn template có tích hợp ô search
function SearchableTemplateSelect({
  value,
  onChange,
  templates = [],
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef(null);

  // Tìm template đang được chọn để hiển thị tên lên nút bấm
  const selectedTpl = templates.find((t) => String(t.id) === String(value));

  // Lọc danh sách template theo từ khóa gõ vào ô search
  const filteredTemplates = (templates || []).filter((t) =>
    String(t.name || "")
      .toLowerCase()
      .includes(searchQuery.toLowerCase()),
  );

  // Đóng dropdown khi click ra ngoài
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
      {/* Nút bấm hiển thị template đang chọn */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!isOpen) setSearchQuery("");
          setIsOpen(!isOpen);
        }}
        className={`${inputCls} flex items-center justify-between text-left bg-gray-50 cursor-pointer select-none`}
      >
        <span
          className={
            selectedTpl ? "text-gray-900 font-medium truncate" : "text-gray-400"
          }
        >
          {selectedTpl ? selectedTpl.name : "-- Choose a Test Template --"}
        </span>
        <ChevronDown size={16} className="text-gray-400 shrink-0 ml-1" />
      </button>

      {/* Menu xổ xuống chứa ô input search */}
      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 p-2 space-y-2">
          {/* Ô input tìm kiếm */}
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
              placeholder="Search templates..."
              className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 text-gray-900"
            />
          </div>

          {/* Danh sách các template đã lọc */}
          <div className="max-h-48 overflow-y-auto space-y-0.5">
            <div
              onClick={() => {
                onChange("");
                setIsOpen(false);
                setSearchQuery("");
              }}
              className="px-3 py-2 text-xs text-gray-500 hover:bg-gray-100 rounded-lg cursor-pointer"
            >
              -- Choose a Test Template --
            </div>

            {filteredTemplates.length === 0 ? (
              <div className="px-3 py-2 text-xs text-gray-400 text-center">
                No templates found
              </div>
            ) : (
              filteredTemplates.map((t) => (
                <div
                  key={t.id}
                  onClick={() => {
                    onChange(String(t.id));
                    setIsOpen(false);
                    setSearchQuery("");
                  }}
                  className={`px-3 py-2 text-xs rounded-lg cursor-pointer transition ${
                    String(value) === String(t.id)
                      ? "bg-brand-50 text-brand-600 font-semibold"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {t.name}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRuns().then((data) => {
      setRuns(data);
      setLoading(false);
    });
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
    <div className="max-w-7xl mx-auto space-y-6">
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
          <button
            onClick={() => navigate("/tests/new")}
            className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl text-sm shadow-lg shadow-brand-500/20 flex items-center gap-2 shrink-0"
          >
            <Plus size={16} /> Create Test Run
          </button>
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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
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
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLE[r.status]}`}
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
