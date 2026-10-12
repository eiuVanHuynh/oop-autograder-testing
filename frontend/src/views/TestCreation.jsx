import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  Square,
  FileText,
  CheckCircle2,
  AlertCircle,
  Upload,
  Settings,
  Terminal,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function TestCreation() {
  const navigate = useNavigate();

  // Form states
  const [testName, setTestName] = useState('');
  const [template, setTemplate] = useState('');
  const [requirements, setRequirements] = useState('');
  const [scope, setScope] = useState('API'); // UI, API, DB
  const [expectedOutput, setExpectedOutput] = useState('');
  const [environment, setEnvironment] = useState('Staging');
  const [timeout, setTimeoutVal] = useState('30');
  const [fileName, setFileName] = useState('');

  // Execution & Real-time panel states
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  const [testStatus, setTestStatus] = useState('IDLE'); // IDLE, RUNNING, COMPLETED, FAILED

  // Templates data mẫu
  const templates = {
    oop: {
      name: 'OOP Core Logic Validation',
      req: 'Verify encapsulation, inheritance, and polymorphism for service classes.',
      scope: 'API',
      expected: 'All unit test assertions pass with 0 memory leaks.',
    },
    api: {
      name: 'RESTful API Endpoint Load & Security',
      req: 'Test rate limiting, payload validation, and authentication headers.',
      scope: 'API',
      expected: 'Status code 200 OK for valid tokens, 401 for unauthorized.',
    },
    ui: {
      name: 'Dashboard UI Responsiveness & Flow',
      req: 'Check sidebar toggle, dark mode transitions, and role-based views.',
      scope: 'UI',
      expected: 'Elements render correctly across mobile and desktop breakpoints.',
    },
  };

  const handleTemplateChange = (e) => {
    const key = e.target.value;
    setTemplate(key);
    if (templates[key]) {
      setTestName(templates[key].name);
      setRequirements(templates[key].req);
      setScope(templates[key].scope);
      setExpectedOutput(templates[key].expected);
      toast.success('Template loaded successfully!');
    }
  };

  // Giả lập Real-time Execution (SSE/Polling simulation)
  useEffect(() => {
    let interval;
    if (isRunning) {
      setTestStatus('RUNNING');
      setProgress(0);
      setLogs([
        '[INFO] Initializing test container...',
        '[INFO] Connecting to environment: ' + environment,
      ]);

      const steps = [
        { prog: 25, log: '[INFO] Compiling codebase and loading test scripts...' },
        { prog: 50, log: '[RUNNING] Executing test suites in sandbox mode...' },
        { prog: 75, log: '[CHECK] Validating assertions against expected output...' },
        { prog: 100, log: '[SUCCESS] Test execution finished successfully!' },
      ];

      let currentStep = 0;
      interval = setInterval(() => {
        if (currentStep < steps.length) {
          setProgress(steps[currentStep].prog);
          setLogs((prev) => [...prev, steps[currentStep].log]);
          currentStep++;
        } else {
          clearInterval(interval);
          setIsRunning(false);
          setTestStatus('COMPLETED');
          toast.success('Test execution completed!');
        }
      }, 1200);
    }
    return () => clearInterval(interval);
  }, [isRunning, environment]);

  const handleStartTest = (e) => {
    e.preventDefault();
    if (!testName || !requirements) {
      toast.error('Please fill in Test Name and Requirements!');
      return;
    }
    setIsRunning(true);
  };

  const handleCancelTest = () => {
    setIsRunning(false);
    setTestStatus('FAILED');
    setLogs((prev) => [...prev, '[WARN] Test execution cancelled by user.']);
    toast.error('Test execution stopped.');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create & Run Automated Test</h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure parameters and monitor real-time execution logs.
          </p>
        </div>
        {/* Template Selector */}
        <div className="w-72">
          <select
            value={template}
            onChange={handleTemplateChange}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
          >
            <option value="">-- Choose a Test Template --</option>
            <option value="oop">OOP Core Logic Validation</option>
            <option value="api">RESTful API Endpoint Test</option>
            <option value="ui">Dashboard UI Flow Test</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Test Configuration Form */}
        <form
          onSubmit={handleStartTest}
          className="lg:col-span-7 bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-5"
        >
          <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <FileText size={18} className="text-purple-600" /> Test Specification
          </h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Test Name *</label>
            <input
              type="text"
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
              placeholder="e.g., User Authentication Suite"
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Test Requirements *
            </label>
            <textarea
              rows={3}
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              placeholder="Describe what needs to be verified..."
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Testing Scope</label>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="UI">UI (Frontend)</option>
                <option value="API">API (Backend)</option>
                <option value="DB">Database</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Environment</label>
              <select
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="Staging">Staging</option>
                <option value="Production">Production</option>
                <option value="Local">Local Sandbox</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expected Output / Assertion
            </label>
            <input
              type="text"
              value={expectedOutput}
              onChange={(e) => setExpectedOutput(e.target.value)}
              placeholder="e.g., Response time < 200ms, status 200"
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Advanced Configs */}
          <div className="pt-4 border-t border-gray-100 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Timeout (seconds)
              </label>
              <input
                type="number"
                value={timeout}
                onChange={(e) => setTimeoutVal(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Attach Test Data (JSON/CSV)
              </label>
              <div className="flex items-center gap-2">
                <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-1.5 transition">
                  <Upload size={16} /> Upload
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => setFileName(e.target.files[0]?.name || '')}
                  />
                </label>
                <span className="text-xs text-gray-500 truncate max-w-[140px]">
                  {fileName || 'No file'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-4">
            {!isRunning ? (
              <button
                type="submit"
                className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2 transition"
              >
                <Play size={18} /> Start Test Execution
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCancelTest}
                className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl shadow-lg shadow-red-500/25 flex items-center justify-center gap-2 transition"
              >
                <Square size={18} /> Cancel Execution
              </button>
            )}
          </div>
        </form>

        {/* RIGHT COLUMN: Real-time Panel & Logs */}
        <div className="lg:col-span-5 bg-gray-900 rounded-2xl shadow-xl border border-gray-800 p-6 flex flex-col justify-between text-gray-100">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold flex items-center gap-2 text-purple-400">
                <Terminal size={18} /> Real-Time Console Logs
              </h3>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  testStatus === 'RUNNING'
                    ? 'bg-yellow-500/20 text-yellow-400 animate-pulse'
                    : testStatus === 'COMPLETED'
                      ? 'bg-green-500/20 text-green-400'
                      : testStatus === 'FAILED'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-gray-800 text-gray-400'
                }`}
              >
                {testStatus}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-purple-500 h-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>

            {/* Terminal Screen */}
            <div className="bg-black/50 rounded-xl p-4 font-mono text-xs h-64 overflow-y-auto space-y-2 border border-gray-800">
              {logs.length === 0 ? (
                <p className="text-gray-500 italic">
                  Ready to run. Click "Start Test Execution" to begin...
                </p>
              ) : (
                logs.map((log, index) => (
                  <div
                    key={index}
                    className={
                      log.includes('SUCCESS')
                        ? 'text-green-400 font-semibold'
                        : log.includes('WARN')
                          ? 'text-yellow-400'
                          : 'text-gray-300'
                    }
                  >
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Bottom Action when completed */}
          {testStatus === 'COMPLETED' && (
            <div className="mt-6 pt-4 border-t border-gray-800">
              <button
                onClick={() => navigate('/runs/101')}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition"
              >
                <CheckCircle2 size={16} /> View Final Test Report
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
