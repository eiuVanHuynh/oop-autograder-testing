// Trang chi tiết một lần chạy (/runs/:id).
// Mọi số trên trang này phải đến từ API thật:
//   GET /runs/:id        -> thông tin lần chạy
//   GET /runs/:id/logs   -> log, và pass/fail từng case bóc ra từ đó (models/runLog.js)
//   GET /catalog/cases   -> tên test case, vì log chỉ có mã
// Không có GET nào trả test_results, nên trạng thái từng case là đọc từ log chứ không
// phải đọc thẳng bảng — case nào runner chưa kịp chạy sẽ không có trạng thái.
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Loader2,
  Copy,
  Download,
  FileCode,
  Play,
  Terminal,
  ListChecks,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../controllers/AuthContext";
import { canRunTest } from "../models/permissions";
import { getRun, fetchRunLogs, rerunRun } from "../services/runService";
import { listCases } from "../services/catalogService";
import { parseCaseResults, msLabel, logTone } from "../models/runLog";
import { buildReportHtml } from "../models/reportHtml";
import { getErrorMessage } from "../services/authService";

// Trạng thái của RUN: running | passed | failed | interrupted (RunRepository tính ra).
// Trạng thái của CASE: thêm timedOut | skipped (status của Playwright, xem models/runLog.js).
// Thiếu một khoá ở đây thì badge rơi về màu xám, trông như "chưa chạy" — sai hẳn với timeout.
const STATUS_STYLE = {
  PASSED: "bg-emerald-100 text-emerald-700",
  FAILED: "bg-red-100 text-red-700",
  TIMEDOUT: "bg-red-100 text-red-700",
  RUNNING: "bg-amber-100 text-amber-700",
  INTERRUPTED: "bg-orange-100 text-orange-700",
  SKIPPED: "bg-gray-100 text-gray-600",
};

const StatusIcon = ({ status, size = 14 }) => {
  if (status === "PASSED") return <CheckCircle2 size={size} />;
  if (status === "RUNNING") return <Loader2 size={size} className="animate-spin" />;
  return <AlertTriangle size={size} />;
};

export default function TestReport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [run, setRun] = useState(null);
  const [logs, setLogs] = useState([]);
  const [titles, setTitles] = useState(new Map()); // tc_code -> title
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rerunning, setRerunning] = useState(false);

  // Tên test case chỉ có ở catalog; log và config của run chỉ mang mã.
  // Hỏng cái này thì bảng vẫn chạy, chỉ thiếu tên -> bắt lỗi riêng, không làm trắng trang.
  useEffect(() => {
    let off = false;
    listCases()
      .then((l) => !off && setTitles(new Map(l.map((c) => [c.code.toUpperCase(), c.title]))))
      .catch(() => {});
    return () => { off = true; };
  }, []);

  useEffect(() => {
    let off = false;
    setLoading(true);
    setError("");
    getRun(id)
      .then((r) => {
        if (off) return;
        setRun(r);
        // Log là nguồn duy nhất cho biết từng case đã làm gì; lỗi đọc log không
        // được làm trắng cả trang nên bắt riêng.
        return fetchRunLogs(id).then((d) => !off && setLogs(d.lines));
      })
      .catch((e) => !off && setError(getErrorMessage(e, "Cannot load this run.")))
      .finally(() => !off && setLoading(false));
    return () => {
      off = true;
    };
  }, [id]);

  const results = parseCaseResults(logs);
  const cases = (run?.testCodes ?? []).map((code) => ({
    code,
    title: titles.get(String(code).toUpperCase()) ?? "",
    ...(results.get(String(code).toUpperCase()) ?? { status: null, ms: null, error: null }),
  }));

  // Tổng kết chỉ tính trên các case ĐÃ có trạng thái trong log; case chưa chạy tới không
  // được đếm là pass cũng không được đếm là fail.
  const done = cases.filter((c) => c.status);
  const passedCount = done.filter((c) => c.status === "PASSED").length;
  const failedCount = done.filter((c) => c.status === "FAILED" || c.status === "TIMEDOUT").length;

  const handleExportHTML = () => {
    const blob = new Blob([buildReportHtml(run, cases, logs)], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `run-${run.id}-report.html`;
    a.click();
    // Thu hồi ở lần tick sau: thu hồi ngay trong cùng nhịp có thể cắt ngang việc tải.
    setTimeout(() => URL.revokeObjectURL(url), 0);
    toast.success("Đã tải báo cáo HTML.");
  };

  // Dự án không có thư viện PDF nào; mở bản HTML rồi để trình duyệt "Save as PDF" —
  // PDF thật, không thêm dependency. Script in nằm cuối body nên DOM đã dựng xong khi chạy.
  const handleExportPDF = () => {
    const win = window.open("", "_blank");
    if (!win) return toast.error("Trình duyệt đã chặn cửa sổ bật lên — hãy cho phép pop-up.");
    win.document.write(buildReportHtml(run, cases, logs, { autoPrint: true }));
    win.document.close();
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Report link copied to clipboard!");
    } catch {
      toast.error("Could not copy the link.");
    }
  };

  // POST /runs/:id/rerun tạo một run MỚI -> điều hướng sang run đó.
  const handleRerun = async () => {
    setRerunning(true);
    try {
      const { runId } = await rerunRun(id);
      toast.success(`Re-run started (#${runId}).`);
      navigate(`/runs/${runId}`);
    } catch (e) {
      toast.error(getErrorMessage(e, "Could not start the re-run."));
    } finally {
      setRerunning(false);
    }
  };

  if (loading) return <p className="text-sm text-gray-500">Loading run…</p>;

  if (error || !run)
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <button
          onClick={() => navigate("/history")}
          className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-brand-600 transition"
        >
          <ArrowLeft size={16} /> Back to History
        </button>
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <AlertTriangle size={32} className="mx-auto mb-3 text-orange-400" />
          <p className="text-sm text-gray-600">{error || "Run not found."}</p>
        </div>
      </div>
    );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Thanh điều hướng + hành động */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={() => navigate("/history")}
          className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-brand-600 transition"
        >
          <ArrowLeft size={16} /> Back to History
        </button>

        <div className="flex flex-wrap items-center gap-2.5">
          {canRunTest(user?.role) && (
            <button
              onClick={handleRerun}
              disabled={rerunning}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold rounded-xl text-sm shadow-sm transition flex items-center gap-2"
            >
              <Play size={16} /> {rerunning ? "Starting…" : "Re-run Test"}
            </button>
          )}
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition"
          >
            <Copy size={16} /> Copy Link
          </button>
          {/* Dropdown Report khi hover */}
          <div className="relative group">
            <button
              type="button"
              className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium shadow-lg shadow-brand-500/20 transition"
            >
              <Download size={16} /> Report
              {/* Icon mũi tên xoay nhẹ khi hover */}
              <span className="text-xs ml-1 opacity-80 group-hover:rotate-180 transition-transform duration-200">
                ▼
              </span>
            </button>

            {/* Menu xổ ra khi hover vào nút cha */}
            <div className="absolute right-0 top-full pt-2 hidden group-hover:block z-50 min-w-[160px] animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-1.5 space-y-1">
                <button
                  onClick={handleExportPDF}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-brand-50 hover:text-brand-600 rounded-lg transition text-left"
                >
                  <Download size={14} /> Export PDF
                </button>
                <button
                  onClick={handleExportHTML}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-brand-50 hover:text-brand-600 rounded-lg transition text-left"
                >
                  <FileCode size={14} /> Export HTML
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Thông tin run */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${
                STATUS_STYLE[run.status] ?? "bg-gray-100 text-gray-600"
              }`}
            >
              <StatusIcon status={run.status} /> {run.status}
            </span>
            <span className="text-xs text-gray-400 font-mono">
              Run ID: #{run.id}
            </span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">{run.name}</h1>
          <p className="text-sm text-gray-500 mt-1">
            Environment:{" "}
            <strong className="text-gray-700">{run.environment}</strong>
            {run.executedAt && <> • Executed at {run.executedAt}</>} • Run by{" "}
            <strong className="text-gray-700">{run.runBy}</strong>
          </p>
        </div>

        <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
          <div className="text-center px-3">
            <p className="text-xs text-gray-500">Total</p>
            <p className="text-lg font-bold text-gray-900">
              {run.testCodes.length || "—"}
            </p>
          </div>
          <div className="w-px h-8 bg-gray-200" />
          <div className="text-center px-3">
            <p className="text-xs text-emerald-600 font-medium">Passed</p>
            <p className="text-lg font-bold text-emerald-600">
              {done.length ? passedCount : "—"}
            </p>
          </div>
          <div className="w-px h-8 bg-gray-200" />
          <div className="text-center px-3">
            <p className="text-xs text-red-500 font-medium">Failed</p>
            <p className="text-lg font-bold text-red-500">
              {done.length ? failedCount : "—"}
            </p>
          </div>
          <div className="w-px h-8 bg-gray-200" />
          <div className="text-center px-3">
            <p className="text-xs text-gray-500">Duration</p>
            <p className="text-lg font-bold text-gray-900 flex items-center justify-center gap-1">
              <Clock size={14} className="text-gray-400" />{" "}
              {run.duration ?? "—"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Các test case trong kế hoạch của run này */}
        <div className="lg:col-span-5 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <ListChecks size={18} className="text-brand-600" /> Test cases
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Danh sách lấy từ config của lần chạy; trạng thái đọc từ log vì chưa có API trả
              bảng test_results. Case không có trạng thái là case runner chưa chạy tới.
            </p>
          </div>
          {cases.length === 0 ? (
            <p className="p-5 text-sm text-gray-500">
              Config của lần chạy này không có mã test nào.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 max-h-[420px] overflow-auto">
              {cases.map((c) => (
                <li key={c.code} className="flex items-start justify-between gap-3 px-5 py-3">
                  {/* Thông báo lỗi KHÔNG lặp lại ở đây: nó đã nằm nguyên văn trong Execution log
                      ngay bên cạnh, in hai lần chỉ làm danh sách khó đọc. */}
                  <div className="min-w-0">
                    <p className="font-mono text-sm text-brand-600">{c.code}</p>
                    <p className="text-sm text-gray-800 break-words">
                      {c.title || <span className="text-gray-400 italic">chưa lấy được tên</span>}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    {c.status ? (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          STATUS_STYLE[c.status] ?? "bg-gray-100 text-gray-600"
                        }`}
                      >
                        <StatusIcon status={c.status} size={12} /> {c.status}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                    {msLabel(c.ms) && (
                      <p className="mt-0.5 font-mono text-[11px] text-gray-400">{msLabel(c.ms)}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Log thật của run */}
        <div className="lg:col-span-7 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <Terminal size={18} className="text-brand-600" /> Execution log
            </h3>
          </div>
          {logs.length === 0 ? (
            <p className="p-5 text-sm text-gray-500">No log lines recorded.</p>
          ) : (
            <div className="max-h-[420px] overflow-auto bg-gray-50 p-4 font-mono text-xs leading-relaxed">
              {logs.map((line, i) => (
                <div key={i} className={`whitespace-pre-wrap ${logTone(line)}`}>{line}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
