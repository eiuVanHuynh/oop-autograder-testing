import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { getRuns } from "../services/runService";
import { getErrorMessage } from "../services/authService";
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

// Status do backend tính: running | passed | failed | interrupted.
const BADGE = {
  PASSED: "bg-emerald-100 text-emerald-700",
  RUNNING: "bg-amber-100 text-amber-700",
  FAILED: "bg-red-100 text-red-700",
  INTERRUPTED: "bg-orange-100 text-orange-700",
};

export default function History() {
  const navigate = useNavigate();

  // Dữ liệu dùng chung với Dashboard (runService)
  const [testRuns, setTestRuns] = useState([]);
  const [selectedRun, setSelectedRun] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRuns()
      .then((data) => {
        setTestRuns(data);
        setSelectedRun(data[0] || null);
      })
      .catch((e) => toast.error(getErrorMessage(e, "Cannot load test runs.")))
      .finally(() => setLoading(false));
  }, []);

  const badge = (status) => BADGE[status] ?? "bg-gray-100 text-gray-600";

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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: Danh sách lịch sử chạy test */}
        <div className="lg:col-span-7 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <HistoryIcon size={18} className="text-brand-600" /> Past Test
              Runs
            </h3>
            <span className="text-xs text-gray-400 font-medium">
              {testRuns.length} runs recorded
            </span>
          </div>

          {/* Khung bọc danh sách có giới hạn chiều cao và bật thanh cuộn tự động */}
          <div className="max-h-[500px] overflow-auto divide-y divide-gray-100">
            {loading && (
              <p className="p-6 text-sm text-gray-500">Loading runs…</p>
            )}
            {!loading && testRuns.length === 0 && (
              <p className="p-6 text-sm text-gray-500">No test runs yet.</p>
            )}
            {testRuns.map((run) => {
              const isSelected = selectedRun?.id === run.id;
              return (
                <div
                  key={run.id}
                  onClick={() => setSelectedRun(run)}
                  className={`p-4 transition cursor-pointer flex items-center justify-between shrink-0 ${
                    isSelected
                      ? "bg-brand-50/60 border-l-4 border-brand-600"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 ${badge(
                          run.status,
                        )}`}
                      >
                        {run.status === "PASSED" ? (
                          <CheckCircle2 size={12} />
                        ) : (
                          <AlertTriangle size={12} />
                        )}
                        {run.status}
                      </span>
                      <span className="text-xs text-gray-400 font-mono">
                        #{run.id}
                      </span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">
                        {run.environment}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-gray-900">
                      {run.name}
                    </h4>
                    <p className="text-xs text-gray-500 flex items-center gap-2">
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
                  </div>

                  {/* Nút bấm xem Report chi tiết */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/runs/${run.id}`);
                      }}
                      className="px-3 py-1.5 bg-white border border-gray-200 hover:border-brand-600 text-gray-700 hover:text-brand-600 rounded-lg text-xs font-medium shadow-sm transition flex items-center gap-1 cursor-pointer"
                    >
                      <Eye size={14} /> Report
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
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
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${badge(
                    selectedRun.status,
                  )}`}
                >
                  {selectedRun.status}
                </span>
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
