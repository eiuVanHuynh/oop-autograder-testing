import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  History as HistoryIcon,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  ArrowRight,
  Eye,
  Calendar,
  Server,
} from 'lucide-react';

export default function History() {
  const navigate = useNavigate();

  // Danh sách lịch sử các lần chạy test mẫu
  const [testRuns, setTestRuns] = useState([
    {
      id: '101',
      name: 'OOP Core Logic & RESTful API Suite',
      status: 'PASSED',
      duration: '4.2s',
      environment: 'Staging',
      executedAt: '2026-10-10 23:15:20',
      total: 12,
      passed: 12,
      failed: 0,
    },
    {
      id: '102',
      name: 'Dashboard UI Flow & Responsiveness',
      status: 'PASSED',
      duration: '3.8s',
      environment: 'Production',
      executedAt: '2026-10-10 21:00:15',
      total: 8,
      passed: 8,
      failed: 0,
    },
    {
      id: '103',
      name: 'Database Transaction Rollback Test',
      status: 'FAILED',
      duration: '5.1s',
      environment: 'Local Sandbox',
      executedAt: '2026-10-09 18:30:00',
      total: 10,
      passed: 8,
      failed: 2,
    },
  ]);

  // State để chọn xem báo cáo nhanh bản ghi nào (nếu muốn xem inline)
  const [selectedRun, setSelectedRun] = useState(testRuns[0]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Execution History & Reports</h1>
          <p className="text-sm text-gray-500 mt-1">
            Review past test runs, statuses, and performance analytics.
          </p>
        </div>
        <button
          onClick={() => navigate('/tests/new')}
          className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl text-sm shadow-lg shadow-purple-500/20 transition flex items-center gap-2"
        >
          <span>+ New Test Run</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: Danh sách lịch sử chạy test */}
        <div className="lg:col-span-7 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <HistoryIcon size={18} className="text-purple-600" /> Past Test Runs
            </h3>
            <span className="text-xs text-gray-400 font-medium">
              {testRuns.length} runs recorded
            </span>
          </div>

          <div className="divide-y divide-gray-100">
            {testRuns.map((run) => {
              const isSelected = selectedRun?.id === run.id;
              return (
                <div
                  key={run.id}
                  onClick={() => setSelectedRun(run)}
                  className={`p-4 transition cursor-pointer flex items-center justify-between ${
                    isSelected ? 'bg-purple-50/60 border-l-4 border-purple-600' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 ${
                          run.status === 'PASSED'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {run.status === 'PASSED' ? (
                          <CheckCircle2 size={12} />
                        ) : (
                          <AlertTriangle size={12} />
                        )}
                        {run.status}
                      </span>
                      <span className="text-xs text-gray-400 font-mono">#{run.id}</span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">
                        {run.environment}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-gray-900">{run.name}</h4>
                    <p className="text-xs text-gray-500 flex items-center gap-2">
                      <span>
                        <Calendar size={12} className="inline mr-1" />
                        {run.executedAt}
                      </span>
                      <span>•</span>
                      <span>
                        <Clock size={12} className="inline mr-1" />
                        {run.duration}
                      </span>
                    </p>
                  </div>

                  {/* Nút bấm xem Report chi tiết */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/runs/${run.id}`);
                      }}
                      className="px-3 py-1.5 bg-white border border-gray-200 hover:border-purple-600 text-gray-700 hover:text-purple-600 rounded-lg text-xs font-medium shadow-sm transition flex items-center gap-1"
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
                  <span className="text-xs text-purple-600 font-mono font-semibold">
                    QUICK REPORT PREVIEW
                  </span>
                  <h3 className="text-lg font-bold text-gray-900 mt-0.5">Run #{selectedRun.id}</h3>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    selectedRun.status === 'PASSED'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {selectedRun.status}
                </span>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-800 mb-1">{selectedRun.name}</h4>
                <p className="text-xs text-gray-500">
                  Environment: <strong className="text-gray-700">{selectedRun.environment}</strong>
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Executed at: {selectedRun.executedAt}
                </p>
              </div>

              {/* Thống kê tỉ lệ */}
              <div className="grid grid-cols-3 gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100 text-center">
                <div>
                  <p className="text-xs text-gray-500">Total Cases</p>
                  <p className="text-base font-bold text-gray-900">{selectedRun.total}</p>
                </div>
                <div>
                  <p className="text-xs text-emerald-600 font-medium">Passed</p>
                  <p className="text-base font-bold text-emerald-600">{selectedRun.passed}</p>
                </div>
                <div>
                  <p className="text-xs text-red-500 font-medium">Failed</p>
                  <p className="text-base font-bold text-red-500">{selectedRun.failed}</p>
                </div>
              </div>

              {/* Nút hành động chuyển đến trang chi tiết Report đầy đủ */}
              <button
                onClick={() => navigate(`/runs/${selectedRun.id}`)}
                className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl text-sm shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2 transition"
              >
                <span>View Full Report & Diff Viewer</span> <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <FileText size={40} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Select a test run from the left list to preview its report.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
