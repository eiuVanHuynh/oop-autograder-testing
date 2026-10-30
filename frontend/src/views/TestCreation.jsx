// Trang Tạo & Chạy Test (/tests/new).
// Create & run test page (/tests/new).
//
// Theo docs/backend/api-endpoints.md mục 5-6: người dùng CHỌN một template có sẵn,
// chọn môi trường + timeout rồi bấm Run. Không còn form nhập "Yêu cầu test" tự do,
// không còn Expected Output, Scope, file đính kèm, Lưu nháp, Lưu thành Template
// (tạo template là việc của trang Templates, vì cần target_json).
//
// Đã nối API thật: POST /runs, GET /runs/:id/logs?after=, POST /runs/:id/cancel
// (services/runService.js). Chạy local với RUNNER=playwright thì backend mở chromium thật.
//
// BACKEND-TODO còn lại:
//  [1] readyCount của template -> GET /templates chưa trả, nên chưa chặn sớm được template rỗng (phải chịu 409)
//  [2] Danh sách môi trường    -> GET /meta/options (🟡, hiện: hằng số trong models/options.js)
//  [6] Thanh tiến độ           -> API không trả %, nên chỉ hiện trạng thái chạy/xong
//  [7] Đơn vị timeout          -> form dùng GIÂY, backend dùng MILI-GIÂY (đã đổi khi gửi POST /runs)

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Play,
  Square,
  FileText,
  CheckCircle2,
  Server,
  Terminal,
  Search,
  ChevronDown,
  Clock,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../controllers/AuthContext";
import { canRunTest } from "../models/permissions";
import { listTemplates } from "../services/templateService";
import { startRun, fetchRunLogs, cancelRun } from "../services/runService";
import { getErrorMessage } from "../services/authService";
import { ENVIRONMENTS } from "../models/options"; // BACKEND-TODO [2]: GET /meta/options

// Form dùng GIÂY; khi gửi POST /runs nhân 1000 (backend lưu mili-giây).
const TIMEOUTS = ["15", "30", "60", "120"];
const POLL_MS = 1200; // BACKEND-TODO [4]: chu kỳ hỏi log mới (1-2 giây)

const inputCls =
  "w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";

// Trạng thái hiển thị của khung log. Backend dùng: running / passed / failed / cancelled.
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

  const selectedTpl = templates.find((t) => String(t.id) === String(value));

  const filteredTemplates = (templates || []).filter((t) =>
    String(t.name || "")
      .toLowerCase()
      .includes(searchQuery.toLowerCase()),
  );

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

      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 p-2 space-y-2">
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

export default function TestCreation() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canRun = canRunTest(user?.role);

  // GET /templates. BACKEND-TODO [1]: backend chưa trả readyCount.
  const [templates, setTemplates] = useState([]);
  useEffect(() => {
    listTemplates()
      // Template đã deactivate thì không cho chọn chạy (issue #41 mục 2).
      .then((list) => setTemplates(list.filter((t) => t.status !== "inactive")))
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
  const [logs, setLogs] = useState([]);
  const [testStatus, setTestStatus] = useState("IDLE");

  const selected = templates.find((t) => String(t.id) === templateId);

  const handleTemplateChange = (id) => {
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

  // Hỏi log mới theo chu kỳ: GET /runs/:id/logs?after=<seq dòng cuối đã nhận>.
  useEffect(() => {
    if (!isRunning || !runId) return;
    let after = 0;
    let stopped = false;

    const tick = async () => {
      try {
        const res = await fetchRunLogs(runId, after);
        if (stopped) return;
        if (res.lines.length) setLogs((prev) => [...prev, ...res.lines]);
        after = res.nextAfter;
        if (res.status && res.status !== "running") {
          setIsRunning(false);
          // Backend dùng 'interrupted' cho run bị hủy.
          const finalStatus =
            res.status === "interrupted" ? "CANCELLED" : res.status.toUpperCase();
          setTestStatus(finalStatus);
          if (finalStatus === "PASSED")
            toast.success("Test execution completed!");
          if (finalStatus === "FAILED") toast.error("Test execution failed.");
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
    <div className="max-w-10xl mx-auto space-y-6">
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
            {/* Sử dụng component SearchableTemplateSelect thay cho thẻ select cũ */}
            <SearchableTemplateSelect
              value={templateId}
              templates={templates}
              disabled={isRunning}
              onChange={handleTemplateChange}
            />
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
              <Clock size={20} className="text-brand-600" /> Execution Time
              Setup
            </h3>
            {/* Để đây khi nào cần thì lấy lại - Đợi Vân xác nhận */}
            {/* Môi trường
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
            </div> */}

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
              <div className="space-y-1">
                <input
                  type="range"
                  min="5"
                  max="300"
                  step="5"
                  disabled={isRunning}
                  value={timeout}
                  onChange={(e) => setTimeoutSec(e.target.value)}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-600 disabled:opacity-50"
                />
                <div className="flex justify-between text-[11px] text-gray-400 font-mono">
                  <span>5s</span>
                  <span>150s</span>
                  <span>300s</span>
                </div>
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

        <div>
          {/* BACKEND-TODO [6]: API không trả %, nên hiện trạng thái thay cho con số tự bịa. */}
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progress</span>
            <span>
              {isRunning
                ? "Running…"
                : testStatus === "IDLE"
                  ? "—"
                  : "Finished"}
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className={`bg-brand-600 h-full transition-all duration-300 ${
                isRunning
                  ? "w-1/3 animate-pulse"
                  : testStatus === "IDLE"
                    ? "w-0"
                    : "w-full"
              }`}
            />
          </div>
        </div>

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
