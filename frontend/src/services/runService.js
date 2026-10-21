import { buildMockRuns } from '../models/mockData';

// Hiện dùng dữ liệu mẫu. Khi backend xong, thay thân hàm bằng API.get('/runs') (giữ nguyên chữ ký).
const runs = buildMockRuns();

export const getRuns = async () => runs;

export function computeStats(list) {
  const finished = list.filter((r) => r.status !== 'RUNNING');
  const passed = finished.filter((r) => r.status === 'PASSED').length;
  const lastFailed = list.find((r) => r.status === 'FAILED'); // list đã sắp mới -> cũ
  return {
    total: list.length,
    passRate: finished.length ? Math.round((passed / finished.length) * 100) : 0,
    running: list.filter((r) => r.status === 'RUNNING').length,
    lastFailed: lastFailed || null,
  };
}

// Pass/Fail theo ngày cho `days` ngày gần nhất (cũ -> mới), bỏ qua run đang chạy.
export function dailyPassFail(list, days = 7) {
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const dayRuns = list.filter((r) => r.executedAt.startsWith(key) && r.status !== 'RUNNING');
    out.push({
      date: `${d.getDate()}/${d.getMonth() + 1}`,
      Pass: dayRuns.filter((r) => r.status === 'PASSED').length,
      Fail: dayRuns.filter((r) => r.status === 'FAILED').length,
    });
  }
  return out;
}
