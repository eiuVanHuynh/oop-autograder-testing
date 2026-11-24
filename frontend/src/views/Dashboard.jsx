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
import { getRuns, computeStats, dailyPassFail } from "../services/runService";
import { getErrorMessage } from "../services/authService";
import DataTable from "../components/ui/DataTable";
import StatusBadge from "../components/ui/StatusBadge";

// Cột của bảng "Recent test runs"; navigate truyền vào vì nút Report cần điều hướng.
const RECENT_COLUMNS = (navigate) => [
  { key: "id", header: "ID", className: "font-mono text-gray-500", render: (r) => `#${r.id}` },
  { key: "name", header: "Name", card: "title", className: "font-medium text-gray-900", render: (r) => r.name },
  { key: "runBy", header: "Run by", className: "text-gray-600", render: (r) => r.runBy },
  { key: "executedAt", header: "Executed at", className: "text-gray-600", render: (r) => r.executedAt },
  { key: "status", header: "Status", card: "badge", render: (r) => <StatusBadge status={r.status} /> },
  {
    key: "actions",
    header: "",
    align: "right",
    render: (r) => (
      <button
        onClick={(e) => {
          e.stopPropagation();
          navigate(`/runs/${r.id}`);
        }}
        className="px-3 py-1.5 border border-gray-200 hover:border-brand-600 hover:text-brand-600 rounded-lg text-xs font-medium inline-flex items-center gap-1"
      >
        <Eye size={14} /> Report
      </button>
    ),
  },
];

const padNumber = (value) => String(value).padStart(2, "0");

const parseExecutedAt = (value) => {
  if (!value) return null;

  const match = String(value).match(
    /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/
  );

  if (!match) return null;

  const [, y, m, d, h, min, s] = match;

  const date = new Date(
    Number(y),
    Number(m) - 1,
    Number(d),
    Number(h),
    Number(min),
    Number(s)
  );

  return Number.isNaN(date.getTime()) ? null : date;
};

const buildStatistics = (
  runs,
  mode,
  selectedDate,
  selectedMonth,
  selectedYear,
  selectedQuarter
) => {
  let periods = [];

  if (mode === "day") {
    for (let hour = 0; hour < 24; hour++) {
      periods.push({
        key: `${selectedDate} ${padNumber(hour)}`,
        label: `${padNumber(hour)}:00`,
      });
    }
  }

  if (mode === "month") {
    const [year, month] = selectedMonth.split("-").map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      periods.push({
        key: `${year}-${padNumber(month)}-${padNumber(day)}`,
        label: String(day),
      });
    }
  }

  if (mode === "quarter") {
    const firstMonth = (selectedQuarter - 1) * 3;

    for (let i = 0; i < 3; i++) {
      const month = firstMonth + i + 1;

      periods.push({
        key: `${selectedYear}-${padNumber(month)}`,
        label: new Date(selectedYear, month - 1).toLocaleString(
          "en-US",
          { month: "short" }
        ),
      });
    }
  }

  if (mode === "year") {
    for (let month = 1; month <= 12; month++) {
      periods.push({
        key: `${selectedYear}-${padNumber(month)}`,
        label: new Date(selectedYear, month - 1).toLocaleString(
          "en-US",
          { month: "short" }
        ),
      });
    }
  }

  return periods.map((period) => {
    const result = {
      ...period,
      Pass: 0,
      Fail: 0,
      Running: 0,
      Interrupted: 0,
      Total: 0,
    };

    runs.forEach((run) => {
      const executedAt = parseExecutedAt(run.executedAt);

      if (!executedAt) return;

      let runKey;

      if (mode === "day") {
        runKey = `${run.executedAt.slice(0, 10)} ${padNumber(
          executedAt.getHours()
        )}`;
      } else if (mode === "month") {
        runKey = run.executedAt.slice(0, 10);
      } else {
        runKey = `${executedAt.getFullYear()}-${padNumber(
          executedAt.getMonth() + 1
        )}`;
      }

      if (runKey !== period.key) return;

      const status = String(run.status || "").toUpperCase();

      if (status === "PASSED") {
        result.Pass++;
      } else if (status === "FAILED" || status === "TIMED_OUT") {
        result.Fail++;
      } else if (status === "RUNNING") {
        result.Running++;
      } else if (status === "INTERRUPTED") {
        result.Interrupted++;
      }

      result.Total++;
    });

    return result;
  });
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);

  const [statisticsMode, setStatisticsMode] = useState("day");

  const [statisticsDate, setStatisticsDate] = useState(() => {
    const now = new Date();

    return `${now.getFullYear()}-${padNumber(
      now.getMonth() + 1
    )}-${padNumber(now.getDate())}`;
  });

  const [statisticsMonth, setStatisticsMonth] = useState(() => {
    const now = new Date();

    return `${now.getFullYear()}-${padNumber(now.getMonth() + 1)}`;
  });

  const [statisticsYear, setStatisticsYear] = useState(
    String(new Date().getFullYear())
  );

  const [statisticsQuarter, setStatisticsQuarter] = useState(
    String(Math.floor(new Date().getMonth() / 3) + 1)
  );

  useEffect(() => {
    // GET /runs lỗi thì vẫn phải thoát trạng thái loading, nếu không trang treo ở "Loading…".
    getRuns()
      .then(setRuns)
      .catch((e) => toast.error(getErrorMessage(e, "Cannot load test runs.")))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => computeStats(runs), [runs]);
  const chartData = useMemo(() => dailyPassFail(runs, 7), [runs]);

  const statisticsRows = useMemo(
    () =>
      buildStatistics(
        runs,
        statisticsMode,
        statisticsDate,
        statisticsMonth,
        Number(statisticsYear),
        Number(statisticsQuarter)
      ),
    [
      runs,
      statisticsMode,
      statisticsDate,
      statisticsMonth,
      statisticsYear,
      statisticsQuarter,
    ]
  );
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

        {/* Execution Statistics */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="flex flex-col gap-4 mb-6">
            <div>
              <h3 className="text-base font-semibold text-gray-800">
                Execution Statistics
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                View test execution results by time period.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {[
                { value: "day", label: "Day" },
                { value: "month", label: "Month" },
                { value: "quarter", label: "Quarter" },
                { value: "year", label: "Year" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setStatisticsMode(option.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${statisticsMode === option.value
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                >
                  {option.label}
                </button>
              ))}

              {statisticsMode === "day" && (
                <input
                  type="date"
                  value={statisticsDate}
                  onChange={(e) => setStatisticsDate(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              )}

              {statisticsMode === "month" && (
                <input
                  type="month"
                  value={statisticsMonth}
                  onChange={(e) => setStatisticsMonth(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              )}

              {statisticsMode === "quarter" && (
                <>
                  <select
                    value={statisticsQuarter}
                    onChange={(e) => setStatisticsQuarter(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="1">Q1 (Jan - Mar)</option>
                    <option value="2">Q2 (Apr - Jun)</option>
                    <option value="3">Q3 (Jul - Sep)</option>
                    <option value="4">Q4 (Oct - Dec)</option>
                  </select>

                  <input
                    type="number"
                    min="2000"
                    max="2100"
                    value={statisticsYear}
                    onChange={(e) => setStatisticsYear(e.target.value)}
                    className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </>
              )}

              {statisticsMode === "year" && (
                <input
                  type="number"
                  min="2000"
                  max="2100"
                  value={statisticsYear}
                  onChange={(e) => setStatisticsYear(e.target.value)}
                  className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              )}
            </div>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statisticsRows}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />

                <Bar
                  dataKey="Pass"
                  name="Passed"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                />

                <Bar
                  dataKey="Fail"
                  name="Failed"
                  fill="#ef4444"
                  radius={[4, 4, 0, 0]}
                />

                <Bar
                  dataKey="Running"
                  name="Running"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                />

                <Bar
                  dataKey="Interrupted"
                  name="Interrupted"
                  fill="#f59e0b"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="overflow-x-auto mt-6">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                <tr>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3 text-center">Passed</th>
                  <th className="px-4 py-3 text-center">Failed</th>
                  <th className="px-4 py-3 text-center">Running</th>
                  <th className="px-4 py-3 text-center">Interrupted</th>
                  <th className="px-4 py-3 text-center">Total</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {statisticsRows.map((row) => (
                  <tr key={row.key} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-700">
                      {row.label}
                    </td>

                    <td className="px-4 py-3 text-center text-green-600">
                      {row.Pass}
                    </td>

                    <td className="px-4 py-3 text-center text-red-600">
                      {row.Fail}
                    </td>

                    <td className="px-4 py-3 text-center text-blue-600">
                      {row.Running}
                    </td>

                    <td className="px-4 py-3 text-center text-amber-600">
                      {row.Interrupted}
                    </td>

                    <td className="px-4 py-3 text-center font-semibold text-gray-800">
                      {row.Total}
                    </td>
                  </tr>
                ))}

                {statisticsRows.every((row) => row.Total === 0) && (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-4 py-8 text-center text-gray-400"
                    >
                      No execution data for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
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

      <DataTable
        columns={RECENT_COLUMNS(navigate)}
        rows={recent}
        onRowClick={(r) => navigate(`/runs/${r.id}`)}
        loading={loading}
        empty="No test runs yet."
        cards
        viewKey="dashboard"
        maxHeight="400px"
        toolbar={
          <div className="flex items-center gap-3">
            <h3 className="text-base font-semibold text-gray-800">Recent test runs</h3>
            <button
              onClick={() => navigate("/history")}
              className="text-xs text-brand-600 font-medium hover:underline"
            >
              View all
            </button>
          </div>
        }
      />
    </div>
  );
}