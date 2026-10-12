// Dữ liệu mẫu dùng chung cho Dashboard / History / Template cho đến khi backend sẵn sàng.
const pad = (n) => String(n).padStart(2, '0');

export const formatDateTime = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

const SUITES = [
  ['OOP Core Logic & RESTful API Suite', 'Staging', 12],
  ['Dashboard UI Flow & Responsiveness', 'Production', 8],
  ['Database Transaction Rollback Test', 'Local Sandbox', 10],
  ['Auth & Role Permission Suite', 'Staging', 9],
  ['Submission Upload Validation', 'Staging', 15],
];

// Sinh ~2-3 run mỗi ngày trong 14 ngày gần nhất (xác định, không random để UI ổn định).
export function buildMockRuns(now = new Date()) {
  const runs = [];
  let id = 101;
  for (let day = 0; day < 14; day++) {
    const perDay = 2 + (day % 2);
    for (let k = 0; k < perDay; k++) {
      const [name, environment, total] = SUITES[(day + k) % SUITES.length];
      const failed = (day * 3 + k * 5) % 7 === 0 ? 2 : (day + k) % 5 === 0 ? 1 : 0;
      const at = new Date(now);
      at.setDate(now.getDate() - day);
      at.setHours(23 - k * 3, 15 - k * 4 + 10, 20, 0);
      runs.push({
        id: String(id++),
        name,
        status: failed > 0 ? 'FAILED' : 'PASSED',
        duration: `${(3 + ((day + k) % 6) * 0.7).toFixed(1)}s`,
        environment,
        executedAt: formatDateTime(at),
        total,
        passed: total - failed,
        failed,
        runBy: ['Nguyễn Văn A', 'Trần Thị B', 'Lê Văn C'][(day + k) % 3],
      });
    }
  }
  // 1 run đang chạy để thẻ "Running" có dữ liệu.
  runs[0] = { ...runs[0], status: 'RUNNING', duration: '--', passed: 0, failed: 0 };
  return runs;
}

export const SEED_TEMPLATES = [
  {
    id: 'tpl-oop',
    name: 'OOP Core Logic Validation',
    requirements: 'Verify encapsulation, inheritance, and polymorphism for service classes.',
    scope: 'API',
    expectedOutput: 'All unit test assertions pass with 0 memory leaks.',
    createdBy: 'Nguyễn Văn A',
    updatedAt: '2026-10-08',
  },
  {
    id: 'tpl-api',
    name: 'RESTful API Endpoint Load & Security',
    requirements: 'Test rate limiting, payload validation, and authentication headers.',
    scope: 'API',
    expectedOutput: 'Status code 200 OK for valid tokens, 401 for unauthorized.',
    createdBy: 'Nguyễn Văn A',
    updatedAt: '2026-10-08',
  },
  {
    id: 'tpl-ui',
    name: 'Dashboard UI Responsiveness & Flow',
    requirements: 'Check sidebar toggle, dark mode transitions, and role-based views.',
    scope: 'UI',
    expectedOutput: 'Elements render correctly across mobile and desktop breakpoints.',
    createdBy: 'Trần Thị B',
    updatedAt: '2026-10-09',
  },
];
