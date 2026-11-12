import { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import { getRuns } from "../services/runService";
import { getErrorMessage } from "../services/authService";
import { ENVIRONMENTS } from "../models/options";
import { parseQuery, buildQuery } from "../models/searchTags";
import { getTableView, setTableView } from "../models/tableView";
import FilterBar from "../components/ui/FilterBar";
import FilterMenu from "../components/ui/FilterMenu";
import DataTable, { TableViewToggle } from "../components/ui/DataTable";
import StatusBadge from "../components/ui/StatusBadge";
import IconButton from "../components/ui/IconButton";
import { useNavigate } from "react-router-dom";
import {
  History as HistoryIcon,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  ArrowRight,
  Eye,
  Calendar,
} from "lucide-react";

// Status do backend tính: running | passed | failed | interrupted. Màu nằm ở StatusBadge.
const RUN_STATUSES = ["PASSED", "RUNNING", "FAILED", "INTERRUPTED"];

// Tag của riêng trang History: trạng thái run + môi trường. Không dùng chung với Test Cases.
const GROUPS = [
  {
    key: "status",
    label: "Status",
    allLabel: "All status",
    options: RUN_STATUSES,
  },
  {
    key: "env",
    label: "Environment",
    allLabel: "All environments",
    options: ENVIRONMENTS,
  },
];

export default function History() {
  const navigate = useNavigate();

  // Dữ liệu dùng chung với Dashboard (runService)
  const [testRuns, setTestRuns] = useState([]);
  const [selectedRun, setSelectedRun] = useState(null);
  const [loading, setLoading] = useState(true);
  // Bảng hay thẻ: trang giữ state vì nút nằm trên FilterBar, không nằm trong DataTable.
  const [view, setView] = useState(() => getTableView("history"));
  const changeView = (v) => {
    setView(v);
    setTableView("history", v);
  };
  const [q, setQ] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  // Ô search là nguồn sự thật duy nhất: tag nằm trong `q`, filter suy ra từ nó.
  const { filters, text } = useMemo(() => parseQuery(q, GROUPS), [q]);

  // GET /runs chỉ nhận 1 giá trị mỗi nhóm nên lọc hẳn ở client, như Templates đang làm.
  const shown = useMemo(() => {
    const k = text.trim().toLowerCase();
    return testRuns.filter(
      (r) =>
        (filters.status.length === 0 || filters.status.includes(r.status)) &&
        (filters.env.length === 0 || filters.env.includes(r.environment)) &&
        (!k ||
          r.name.toLowerCase().includes(k) ||
          String(r.id).includes(k.replace(/^#/, ""))),
    );
  }, [testRuns, filters, text]);

  useEffect(() => {
    setLoading(true);
    getRuns()
      .then((data) => {
        setTestRuns(data);
        setSelectedRun(data[0] || null);
      })
      .catch((e) => toast.error(getErrorMessage(e, "Cannot load test runs.")))
      .finally(() => setLoading(false));
  }, [reloadKey]);

  return (
    <div className="max-w-screen-2xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Execution History & Reports
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Review past test runs, statuses, and performance analytics.
          </p>
        </div>
      </div>

      <FilterBar
        value={q}
        onChange={setQ}
        placeholder="Search run name / #id, or pick a tag"
        onRefresh={() => setReloadKey((k) => k + 1)}
        loading={loading}
        tagGroups={GROUPS}
        trailing={<TableViewToggle value={view} onChange={changeView} />}
      >
        <FilterMenu
          groups={GROUPS}
          value={filters}
          onChange={(next) => setQ(buildQuery(next, text, GROUPS))}
        />
      </FilterBar>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: Danh sách lịch sử chạy test – xem dạng bảng hoặc dạng thẻ */}
        <div className="lg:col-span-7">
          <DataTable
            rows={shown}
            loading={loading}
            empty={testRuns.length === 0 ? "No test runs yet." : "No run matches this filter."}
            emptyIcon={HistoryIcon}
            maxHeight="500px"
            pageSize={8}
            view={view}
            onViewChange={changeView}
            rowKey={(run) => run.id}
            onRowClick={setSelectedRun}
            rowClassName={(run) => (selectedRun?.id === run.id ? "bg-brand-50/60" : "")}
            toolbar={
              <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <HistoryIcon size={18} className="text-brand-600" /> Past Test Runs
              </h3>
            }
            columns={[
              {
                key: "status",
                header: "Status",
                render: (run) => (
                  <StatusBadge
                    status={run.status}
                    icon={run.status === "PASSED" ? CheckCircle2 : AlertTriangle}
                  />
                ),
              },
              {
                key: "name",
                header: "Run",
                render: (run) => (
                  <>
                    <p className="font-semibold text-gray-900">{run.name}</p>
                    <p className="text-xs text-gray-400 font-mono">#{run.id}</p>
                  </>
                ),
              },
              {
                key: "env",
                header: "Env",
                render: (run) => (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">
                    {run.environment}
                  </span>
                ),
              },
              {
                key: "executedAt",
                header: "Executed at",
                className: "text-xs text-gray-500 whitespace-nowrap",
                render: (run) => run.executedAt,
              },
              {
                key: "duration",
                header: "Duration",
                className: "text-xs text-gray-500",
                render: (run) => run.duration ?? "—",
              },
              {
                key: "actions",
                header: "",
                align: "right",
                render: (run) => (
                  <IconButton
                    icon={Eye}
                    title="Open full report"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/runs/${run.id}`);
                    }}
                  />
                ),
              },
            ]}
            renderCard={(run) => (
              <div
                className={`h-full rounded-xl border p-4 transition cursor-pointer ${
                  selectedRun?.id === run.id
                    ? "border-brand-600 bg-brand-50/60"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge
                    status={run.status}
                    icon={run.status === "PASSED" ? CheckCircle2 : AlertTriangle}
                  />
                  <span className="text-xs text-gray-400 font-mono">#{run.id}</span>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">
                    {run.environment}
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-gray-900 mt-2 break-words">{run.name}</h4>
                <p className="text-xs text-gray-500 flex flex-wrap items-center gap-x-2 mt-1">
                  <span>
                    <Calendar size={12} className="inline mr-1" />
                    {run.executedAt}
                  </span>
                  <span>•</span>
                  <span>
                    <Clock size={12} className="inline mr-1" />
                    {run.duration ?? "—"}
                  </span>
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/runs/${run.id}`);
                  }}
                  className="mt-3 px-3 py-1.5 bg-white border border-gray-200 hover:border-brand-600 text-gray-700 hover:text-brand-600 rounded-lg text-xs font-medium shadow-sm transition flex items-center gap-1 cursor-pointer"
                >
                  <Eye size={14} /> Report
                </button>
              </div>
            )}
          />
        </div>

        {/* RIGHT: Bảng Preview Report nhanh ngay tại History */}
        <div className="lg:col-span-5 bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between">
          {selectedRun ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div>
                  <span className="text-xs text-brand-600 font-mono font-semibold">
                    QUICK REPORT PREVIEW
                  </span>
                  <h3 className="text-lg font-bold text-gray-900 mt-0.5">
                    Run #{selectedRun.id}
                  </h3>
                </div>
                <StatusBadge status={selectedRun.status} className="px-3 py-1" />
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-800 mb-1">
                  {selectedRun.name}
                </h4>
                <p className="text-xs text-gray-500">
                  Environment:{" "}
                  <strong className="text-gray-700">
                    {selectedRun.environment}
                  </strong>
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Executed at: {selectedRun.executedAt}
                </p>
              </div>

              {/* Chỉ các trường GET /runs thật sự trả về. Số case passed/failed nằm ở
                  bảng test_results nhưng chưa có endpoint nào đọc -> không hiển thị. */}
              <div className="grid grid-cols-3 gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100 text-center">
                <div>
                  <p className="text-xs text-gray-500">Planned</p>
                  <p className="text-base font-bold text-gray-900">
                    {selectedRun.testCodes.length || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Duration</p>
                  <p className="text-base font-bold text-gray-900">
                    {selectedRun.duration ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Run by</p>
                  <p className="text-base font-bold text-gray-900">
                    {selectedRun.runBy}
                  </p>
                </div>
              </div>

              {/* Nút hành động chuyển đến trang chi tiết Report đầy đủ */}
              <button
                onClick={() => navigate(`/runs/${selectedRun.id}`)}
                className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl text-sm shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <span>View Full Report</span>{" "}
                <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <FileText size={40} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">
                Select a test run from the left list to preview its report.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
