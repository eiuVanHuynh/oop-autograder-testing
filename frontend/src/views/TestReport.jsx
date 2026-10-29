import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Download,
  Share2,
  Play,
  FileCode,
  Check,
  Copy,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../controllers/AuthContext";
import { canRunTest } from "../models/permissions";

export default function TestReport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("breakdowns"); // 'breakdowns' | 'diff'

  // Dữ liệu mẫu báo cáo chi tiết kèm thông tin Diff (Expected vs Actual)
  const reportData = {
    id: id || "101",
    name: "OOP Core Logic & RESTful API Suite",
    status: "PASSED",
    duration: "4.2s",
    environment: "Staging",
    executedAt: "2026-10-10 23:15:20",
    summary: {
      total: 12,
      passed: 12,
      failed: 0,
      skipped: 0,
    },
    expectedOutput:
      '{\n  "status": 200,\n  "success": true,\n  "data": {\n    "role": "Admin",\n    "permissions": ["READ", "WRITE", "DELETE"]\n  }\n}',
    actualOutput:
      '{\n  "status": 200,\n  "success": true,\n  "data": {\n    "role": "Admin",\n    "permissions": ["READ", "WRITE", "DELETE"]\n  }\n}',
    testCases: [
      {
        id: "TC-01",
        name: "Verify Encapsulation in Service Classes",
        status: "PASSED",
        time: "0.45s",
      },
      {
        id: "TC-02",
        name: "Test Polymorphic Method Overriding",
        status: "PASSED",
        time: "0.38s",
      },
      {
        id: "TC-03",
        name: "REST API Rate Limiting & Auth Header Check",
        status: "PASSED",
        time: "1.20s",
      },
      {
        id: "TC-04",
        name: "Database Transaction Rollback Integrity",
        status: "PASSED",
        time: "2.17s",
      },
    ],
  };

  const handleExportPDF = () => {
    try {
      // Gọi API export PDF ở đây
      // await exportPdfApi();
      toast.success("Exported as PDF successfully!");
    } catch (err) {
      toast.error("Failed to export PDF report!");
    }
  };

  const handleExportHTML = () => {
    try {
      // Gọi API export HTML ở đây
      // await exportHtmlApi();
      toast.success("Exported as HTML successfully!");
    } catch (err) {
      toast.error("Failed to export HTML report!");
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Report link copied to clipboard!");
  };

  const handleRerun = () => {
    toast.loading("Initializing test re-run...", { duration: 1500 });
    setTimeout(() => {
      navigate("/tests/new");
    }, 1500);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Bar Navigation & Actions */}
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
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-sm shadow-sm transition flex items-center gap-2"
            >
              <Play size={16} /> Re-run Test
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

      {/* Header Info Card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${
                reportData.status === "PASSED"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {reportData.status === "PASSED" ? (
                <CheckCircle2 size={14} />
              ) : (
                <AlertTriangle size={14} />
              )}
              {reportData.status}
            </span>
            <span className="text-xs text-gray-400 font-mono">
              Run ID: #{reportData.id}
            </span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">{reportData.name}</h1>
          <p className="text-sm text-gray-500 mt-1">
            Environment:{" "}
            <strong className="text-gray-700">{reportData.environment}</strong>{" "}
            • Executed at {reportData.executedAt}
          </p>
        </div>

        {/* Quick Stats Grid */}
        <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
          <div className="text-center px-3">
            <p className="text-xs text-gray-500">Total</p>
            <p className="text-lg font-bold text-gray-900">
              {reportData.summary.total}
            </p>
          </div>
          <div className="w-px h-8 bg-gray-200"></div>
          <div className="text-center px-3">
            <p className="text-xs text-emerald-600 font-medium">Passed</p>
            <p className="text-lg font-bold text-emerald-600">
              {reportData.summary.passed}
            </p>
          </div>
          <div className="w-px h-8 bg-gray-200"></div>
          <div className="text-center px-3">
            <p className="text-xs text-red-500 font-medium">Failed</p>
            <p className="text-lg font-bold text-red-500">
              {reportData.summary.failed}
            </p>
          </div>
          <div className="w-px h-8 bg-gray-200"></div>
          <div className="text-center px-3">
            <p className="text-xs text-gray-500">Duration</p>
            <p className="text-lg font-bold text-gray-900 flex items-center gap-1">
              <Clock size={14} className="text-gray-400" />{" "}
              {reportData.duration}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs (Breakdowns vs Diff Viewer) */}
      <div className="flex border-b border-gray-200 gap-6">
        <button
          onClick={() => setActiveTab("breakdowns")}
          className={`pb-3 text-sm font-semibold border-b-2 transition ${
            activeTab === "breakdowns"
              ? "border-brand-600 text-brand-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Test Case Breakdowns ({reportData.testCases.length})
        </button>
        <button
          onClick={() => setActiveTab("diff")}
          className={`pb-3 text-sm font-semibold border-b-2 transition ${
            activeTab === "diff"
              ? "border-brand-600 text-brand-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Expected vs Actual (Diff Viewer)
        </button>
      </div>

      {/* TAB 1: Detailed Test Cases Table */}
      {activeTab === "breakdowns" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-6">Case ID</th>
                  <th className="py-3.5 px-6">Test Description</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Execution Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {reportData.testCases.map((tc) => (
                  <tr key={tc.id} className="hover:bg-gray-50/50 transition">
                    <td className="py-4 px-6 font-mono font-medium text-brand-600">
                      {tc.id}
                    </td>
                    <td className="py-4 px-6 text-gray-800 font-medium">
                      {tc.name}
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600">
                        <CheckCircle2 size={12} /> {tc.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right font-mono text-gray-500">
                      {tc.time}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Diff Viewer (Expected vs Actual comparison) */}
      {activeTab === "diff" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Expected Output */}
          <div className="bg-gray-900 rounded-2xl shadow-lg border border-gray-700 p-5 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              {/* Tiêu đề in đậm, màu trắng sáng */}
              <span className="text-xs font-bold uppercase tracking-wider text-white">
                Expected Output
              </span>
              <span className="px-2.5 py-0.5 bg-brand-500/30 text-brand-200 rounded-md text-xs font-mono font-semibold border border-brand-400/40 shadow-sm">
                JSON Schema
              </span>
            </div>
            <div className="max-h-[350px] overflow-auto rounded-xl border border-gray-700 bg-black/60 shadow-inner">
              <pre className="p-4 font-mono text-xs text-gray-100 leading-relaxed whitespace-pre-wrap">
                {reportData.expectedOutput}
              </pre>
            </div>
          </div>

          {/* Actual Output */}
          <div className="bg-gray-900 rounded-2xl shadow-lg border border-gray-700 p-5 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              {/* Tiêu đề in đậm, màu trắng sáng */}
              <span className="text-xs font-bold uppercase tracking-wider text-white">
                Actual Output
              </span>
              <span className="px-2.5 py-0.5 bg-brand-500/30 text-brand-200 rounded-md text-xs font-mono font-semibold border border-brand-400/40 shadow-sm">
                Matched (0 Diff)
              </span>
            </div>
            <div className="max-h-[350px] overflow-auto rounded-xl border border-gray-700 bg-black/60 shadow-inner">
              <pre className="p-4 font-mono text-xs text-gray-100 leading-relaxed whitespace-pre-wrap">
                {reportData.actualOutput}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
