// Trang Tạo & Chạy Test (/tests/new).
// Create & run test page (/tests/new).
//
// Theo docs/backend/api-endpoints.md mục 5-6: người dùng CHỌN một template có sẵn,
// chọn môi trường + timeout rồi bấm Run. Không còn form nhập "Yêu cầu test" tự do,
// không còn Expected Output, Scope, file đính kèm, Lưu nháp, Lưu thành Template
// (tạo template là việc của trang Templates, vì cần target_json).
//
// Hiện dùng dữ liệu giả. Mọi chỗ cần thay bằng backend đều có nhãn "BACKEND-TODO [n]".
// Tìm nhanh bằng cách search "BACKEND-TODO".
//
// BACKEND-TODO – danh sách tổng hợp:
//  [1] Danh sách template  -> ĐÃ NỐI GET /templates. Còn thiếu: readyCount để chặn sớm template rỗng
//  [2] Danh sách môi trường -> GET /meta/options (🟡, hiện: hằng số trong models/options.js)
//  [3] Bấm Run              -> POST /runs { templateId, env, timeout } (hiện: hàm giả startRun)
//  [4] Log + trạng thái     -> GET /runs/:id/logs?after= (hiện: hàm giả fetchRunLogs)
//  [5] Bấm Hủy              -> POST /runs/:id/cancel (hiện: hàm giả cancelRun)
//  [6] Thanh tiến độ        -> API không trả %, cần tự tính hoặc bỏ
//  [7] Đơn vị timeout       -> form dùng GIÂY, backend dùng MILI-GIÂY (đã đổi khi gửi POST /runs)
//  [8] Trạng thái "đang chuẩn bị máy chạy" (20-60s đầu, backend-design.md mục 5)
//  [9] Nút "View Full Report" -> /runs/:id thật (hiện: mã run giả)

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Play,
  Square,
  FileText,
  CheckCircle2,
  Server,
  Terminal,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../controllers/AuthContext";
import { canRunTest } from "../models/permissions";
import { listTemplates } from "../services/templateService";
import { getErrorMessage } from "../services/authService";
import { ENVIRONMENTS } from "../models/options"; // BACKEND-TODO [2]: GET /meta/options

// Form dùng GIÂY; khi gửi POST /runs nhân 1000 (backend lưu mili-giây).
const TIMEOUTS = ["15", "30", "60", "120"];
const POLL_MS = 1200; // BACKEND-TODO [4]: chu kỳ hỏi log mới (1-2 giây)

const inputCls =
  "w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";

// Trạng thái hiển thị của khung log. Backend dùng: running / passed / failed / cancelled.
// Display statuses. Backend uses: running / passed / failed / cancelled.
const STATUS_STYLES = {
  IDLE: "bg-gray-100 text-gray-500",
  RUNNING: "bg-yellow-100 text-yellow-700 animate-pulse",
  PASSED: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
  CANCELLED: "bg-orange-100 text-orange-700",
};

// Thông báo cho các mã lỗi của POST /runs (api-endpoints.md mục 6).
const RUN_ERRORS = {
  403: "Bạn không có quyền chạy test.",
  404: "Template không tồn tại.",
  409: "Template này không có test case nào ở trạng thái ready.",
};

/* =====================================================================
 * PHẦN GIẢ LẬP – xóa cả khối này khi backend xong, thay bằng gọi API thật.
 * MOCK SECTION – delete this whole block when the backend is ready.
 * Chữ ký các hàm giữ đúng với dạng backend sẽ trả, nên phần component bên dưới
 * không cần sửa gì ngoài việc đổi thân hàm.
 * ===================================================================== */
const MOCK_RUN_ID = 101; // BACKEND-TODO [9]: backend trả mã run thật trong 202
const MOCK_LINES = [
  { prog: 0, text: "[INFO] Initializing test container..." },
  { prog: 0, text: "[INFO] Connecting to environment..." },
  { prog: 25, text: "[INFO] Compiling codebase and loading test scripts..." },
  { prog: 50, text: "[RUNNING] Executing test suites in sandbox mode..." },
  {
    prog: 75,
    text: "[CHECK] Validating assertions against expected output...",
  },
  { prog: 100, text: "[SUCCESS] Test execution finished successfully!" },
];
const mockRun = { startedAt: 0, cancelled: false };

// BACKEND-TODO [3]: POST /runs { templateId, env, timeout } -> 202 { runId }.
// Lỗi: 403 (Viewer), 404 (template không tồn tại), 409 (template không có test ready).
async function startRun({ templateId, env, timeout }) {
  void templateId;
  void env;
  void timeout;
  mockRun.startedAt = Date.now();
  mockRun.cancelled = false;
  return { runId: MOCK_RUN_ID };
}

// BACKEND-TODO [4]: GET /runs/:id/logs?after=<số dòng đã nhận> -> { lines, status }.
// status: 'running' | 'passed' | 'failed' | 'cancelled'.
// Nếu muốn nhận log trực tiếp: GET /runs/:id/logs/stream (SSE). Trên Vercel kết nối dài
// có thể bị cắt nên vẫn giữ polling làm phương án dự phòng.
// BACKEND-TODO [6]: 'progress' hiện do mock tự tính. API không trả %.
async function fetchRunLogs(runId, after) {
  void runId;
  if (mockRun.cancelled) return { lines: [], progress: 0, status: "cancelled" };
  const shown = Math.min(
    MOCK_LINES.length,
    Math.floor((Date.now() - mockRun.startedAt) / POLL_MS) + 1,
  );
  const progress = MOCK_LINES[shown - 1].prog;
  return {
    lines: MOCK_LINES.slice(after, shown).map((l) => l.text),
    progress,
    status: shown >= MOCK_LINES.length ? "passed" : "running",
  };
}

// BACKEND-TODO [5]: POST /runs/:id/cancel -> 200. Run đã xong rồi thì trả 409.
async function cancelRun(runId) {
  void runId;
  mockRun.cancelled = true;
}
/* ======================= HẾT PHẦN GIẢ LẬP ======================= */

export default function TestCreation() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canRun = canRunTest(user?.role);

  // GET /templates. BACKEND-TODO [1]: backend chưa trả readyCount.
  const [templates, setTemplates] = useState([]);
  useEffect(() => {
    listTemplates()
      .then(setTemplates)
      .catch((err) =>
        toast.error(getErrorMessage(err, "Cannot load templates.")),
      );
  }, []);

  // Form
  const [templateId, setTemplateId] = useState("");
  const [environment, setEnvironment] = useState("development");
  const [timeout, setTimeoutSec] = useState("30");

  // Chạy test & khung log
  const [runId, setRunId] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  const [testStatus, setTestStatus] = useState("IDLE");

  const selected = templates.find((t) => String(t.id) === templateId);

  const handleTemplateChange = (e) => {
    const id = e.target.value;
    setTemplateId(id);
    const tpl = templates.find((t) => String(t.id) === id);
    if (!tpl) return;
    // Điền sẵn môi trường/timeout mặc định của template (nếu có).
    if (ENVIRONMENTS.some((e) => e.value === tpl.defaultEnv)) {
      setEnvironment(tpl.defaultEnv);
    }
    // defaultTimeoutMs là mili-giây, đổi sang giây cho form.
    const sec = tpl.defaultTimeoutMs ? String(tpl.defaultTimeoutMs / 1000) : "";
    if (TIMEOUTS.includes(sec)) setTimeoutSec(sec);
  };

  const handleStartTest = async (e) => {
    e.preventDefault();
    if (!canRun) return toast.error(RUN_ERRORS[403]);
    if (!selected) return toast.error("Please select a template!");
    // BACKEND-TODO [1]: backend trả readyCount; chặn sớm để khỏi nhận 409.
    if (selected.readyCount === 0) return toast.error(RUN_ERRORS[409]);

    setStarting(true);
    try {
      const res = await startRun({
        templateId: selected.id,
        env: environment,
        timeout: Number(timeout) * 1000, // backend dùng mili-giây
      });
      setRunId(res.runId);
      setProgress(0);
      // BACKEND-TODO [8]: hiện "đang chuẩn bị máy chạy" trong lúc GitHub Actions khởi động.
      setLogs([]);
      setTestStatus("RUNNING");
      setIsRunning(true);
    } catch (err) {
      toast.error(
        RUN_ERRORS[err.response?.status] ||
          err.response?.data?.error?.message ||
          "Cannot start the test run.",
      );
    } finally {
      setStarting(false);
    }
  };

  // Hỏi log mới theo chu kỳ. BACKEND-TODO [4]: giữ nguyên khung này, chỉ đổi fetchRunLogs.
  useEffect(() => {
    if (!isRunning || !runId) return;
    let after = 0;
    let stopped = false;

    const tick = async () => {
      try {
        const res = await fetchRunLogs(runId, after);
        if (stopped) return;
        if (res.lines.length) {
          setLogs((prev) => [...prev, ...res.lines]);
          after += res.lines.length;
        }
        setProgress(res.progress);
        if (res.status !== "running") {
          setIsRunning(false);
          setTestStatus(res.status.toUpperCase());
          if (res.status === "passed")
            toast.success("Test execution completed!");
          if (res.status === "failed") toast.error("Test execution failed.");
        }
      } catch {
        // Mất mạng thoáng qua: bỏ qua, lần hỏi sau sẽ thử lại.
      }
    };

    const timer = setInterval(tick, POLL_MS);
    tick();
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [isRunning, runId]);

  const handleCancelTest = async () => {
    try {
      await cancelRun(runId);
      setIsRunning(false);
      setTestStatus("CANCELLED");
      setLogs((prev) => [...prev, "[WARN] Test execution cancelled by user."]);
      toast.error("Test execution stopped.");
    } catch (err) {
      // 409: run đã chạy xong, không hủy được nữa.
      toast.error(
        err.response?.status === 409
          ? "Run đã kết thúc, không thể hủy."
          : "Cannot cancel the run.",
      );
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Create New Test</h1>
        <p className="text-sm text-gray-600 mt-1">
          Select a template, choose the sandbox environment, and execute in
          real-time
        </p>
      </div>

      <form
        onSubmit={handleStartTest}
        className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
      >
        {/* CỘT TRÁI: chọn template (chỉ đọc phần mô tả) */}
        <section className="lg:col-span-7 bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FileText size={20} className="text-brand-600" /> Test Template
          </h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Assignment Template *
            </label>
            <select
              value={templateId}
              onChange={handleTemplateChange}
              disabled={isRunning}
              className={inputCls}
            >
              <option value="">-- Choose a Test Template --</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Thông tin template: chỉ đọc, không cho sửa ở trang này */}
          {selected && (
            <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-gray-900">
                  {selected.name}
                </span>
                {selected.scope && (
                  <span className="px-2 py-0.5 rounded-full bg-brand-50 text-brand-600 text-xs font-semibold">
                    {selected.scope}
                  </span>
                )}
              </div>
              {/* BACKEND-TODO [1]: trường mô tả của backend là "description"
                  (dữ liệu giả đang dùng "requirements"). */}
              <p className="text-gray-600">
                {selected.description ?? selected.requirements}
              </p>
              {selected.readyCount !== undefined && (
                <p className="text-xs text-gray-500">
                  {selected.readyCount} ready test case(s)
                </p>
              )}
            </div>
          )}
        </section>

        {/* CỘT PHẢI: môi trường, timeout, nút chạy */}
        <div className="lg:col-span-5 space-y-6">
          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Server size={20} className="text-brand-600" /> Sandbox Execution
              Configuration
            </h3>

            {/* Môi trường */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Isolated Container Environment
              </label>
              <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-xl">
                {ENVIRONMENTS.map((env) => (
                  <button
                    key={env.value}
                    type="button"
                    disabled={isRunning}
                    onClick={() => setEnvironment(env.value)}
                    className={`py-2 rounded-lg text-sm transition ${
                      environment === env.value
                        ? "bg-white text-brand-600 font-semibold shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    {env.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Timeout */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  Execution Timeout Limit
                </label>
                <span className="text-sm font-semibold text-brand-600">
                  {timeout} seconds
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {TIMEOUTS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    disabled={isRunning}
                    onClick={() => setTimeoutSec(t)}
                    className={`py-2 rounded-lg text-sm transition ${
                      timeout === t
                        ? "bg-brand-600 text-white font-semibold"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {t}s
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isRunning || starting || !canRun}
              title={canRun ? undefined : RUN_ERRORS[403]}
              className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              <Play size={18} /> {starting ? "Starting..." : "Run Test Now"}
            </button>
          </section>
        </div>
      </form>

      {/* Real-time Execution Logs */}
      <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Terminal size={20} className="text-brand-600" /> Real-time
              Execution Logs
            </h3>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[testStatus]}`}
            >
              {testStatus}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isRunning && (
              <button
                type="button"
                onClick={handleCancelTest}
                className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-medium flex items-center gap-1.5 transition"
              >
                <Square size={14} /> Cancel Test
              </button>
            )}
            {/* BACKEND-TODO [9]: runId là mã run thật do POST /runs trả về. */}
            {(testStatus === "PASSED" || testStatus === "FAILED") && (
              <button
                type="button"
                onClick={() => navigate(`/runs/${runId}`)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 transition"
              >
                <CheckCircle2 size={14} /> View Full Report
              </button>
            )}
          </div>
        </div>

        {/* Progress. BACKEND-TODO [6]: API không trả %; tính từ số test đã xong hoặc bỏ thanh này. */}
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-brand-600 h-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Terminal */}
        <div className="bg-gray-900 rounded-xl p-4 font-mono text-xs h-64 overflow-y-auto space-y-2">
          {logs.length === 0 ? (
            <p className="text-gray-500 italic">
              {isRunning
                ? "Waiting for the runner to start..."
                : 'Ready to run. Click "Run Test Now" to begin...'}
            </p>
          ) : (
            logs.map((log, index) => (
              <div
                key={index}
                className={
                  log.includes("SUCCESS")
                    ? "text-green-400 font-semibold"
                    : log.includes("WARN")
                      ? "text-yellow-400"
                      : "text-gray-300"
                }
              >
                {log}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
