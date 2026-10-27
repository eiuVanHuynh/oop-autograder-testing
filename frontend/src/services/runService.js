import API from "../models/api";

const unwrap = (response) => response?.data?.data ?? response?.data ?? response;

export const normalizeRunStatus = (value, row = {}) => {
  const status = String(value || "")
    .trim()
    .toLowerCase();
  if (["running", "queued", "pending", "in_progress"].includes(status))
    return "RUNNING";
  if (["passed", "pass", "success", "successful"].includes(status))
    return "PASSED";
  if (["failed", "fail", "error", "timedout", "timed_out"].includes(status))
    return "FAILED";
  if (["cancelled", "canceled", "interrupted", "aborted"].includes(status))
    return "CANCELLED";
  if (["completed", "complete", "finished"].includes(status)) {
    const failed = Number(
      row.failed_count ?? row.fail_count ?? row.failed ?? 0,
    );
    return failed > 0 ? "FAILED" : "PASSED";
  }
  if (row.finished_at == null) return "RUNNING";
  if (Number(row.failed_count ?? row.fail_count ?? row.failed ?? 0) > 0)
    return "FAILED";
  return "PASSED";
};

const parseJson = (value) => {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
};

const formatDuration = (row) => {
  if (row.duration) return String(row.duration);
  if (row.duration_ms != null)
    return `${Math.max(0, Math.round(Number(row.duration_ms) / 1000))}s`;
  if (row.started_at && row.finished_at) {
    const seconds = Math.max(
      0,
      Math.round((new Date(row.finished_at) - new Date(row.started_at)) / 1000),
    );
    return `${seconds}s`;
  }
  return row.finished_at ? "—" : "Running";
};

export const toRun = (row = {}) => {
  const config = parseJson(row.config_json);
  const status = normalizeRunStatus(row.status ?? row.run_status, row);
  const createdAt = row.created_at || row.started_at || row.executed_at || null;
  return {
    ...row,
    id: row.run_id ?? row.id,
    name: row.run_name ?? row.name ?? `Run #${row.run_id ?? row.id ?? ""}`,
    status,
    environment: row.env ?? row.environment ?? config.env ?? "—",
    executedAt: createdAt ? new Date(createdAt).toLocaleString() : "—",
    createdAt,
    duration: formatDuration(row),
    progress: status === "RUNNING" ? Number(row.progress ?? 0) : 100,
    config,
  };
};

export const getRuns = async (params = {}) => {
  const payload = unwrap(await API.get("/runs", { params }));
  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : [];
  return rows.map(toRun);
};

export const getRun = async (runId) =>
  toRun(unwrap(await API.get(`/runs/${runId}`)));

export const startRun = async ({ templateId, testIds, env, timeout }) => {
  const body = {
    ...(templateId != null ? { templateId: Number(templateId) } : {}),
    ...(Array.isArray(testIds) && testIds.length ? { testIds } : {}),
    ...(env ? { env } : {}),
    ...(timeout ? { timeout: Number(timeout) } : {}),
  };
  const run = unwrap(await API.post("/runs", body));
  const runId = run?.runId ?? run?.run_id ?? run?.id;
  if (runId == null) {
    const error = new Error("API tạo run không trả về runId/run_id.");
    error.response = { data: { error: { message: error.message } } };
    throw error;
  }
  return { ...run, runId };
};

const normalizeLogStatus = (status, run) => {
  const normalized = normalizeRunStatus(
    status ?? run?.status ?? run?.run_status,
    run || {},
  );
  return normalized === "RUNNING" ? "running" : normalized.toLowerCase();
};

export const fetchRunLogs = async (runId, after = 0) => {
  const payload = unwrap(
    await API.get(`/runs/${runId}/logs`, { params: { after } }),
  );
  const rawLines = Array.isArray(payload)
    ? payload
    : (payload?.lines ?? payload?.logs ?? []);
  const lines = rawLines.map((line) => {
    if (typeof line === "string") return line;
    const level = line.level ? `[${String(line.level).toUpperCase()}] ` : "";
    return `${level}${line.message ?? line.text ?? JSON.stringify(line)}`;
  });

  // Endpoint logs có thể chưa trả trạng thái; đọc chi tiết run hiện có để xác định còn chạy hay đã kết thúc.
  let run = payload?.run ?? null;
  if (!payload?.status && !payload?.run_status) {
    try {
      run = await getRun(runId);
    } catch {
      /* Giữ polling nếu endpoint chi tiết tạm lỗi. */
    }
  }
  const status = normalizeLogStatus(
    payload?.status ?? payload?.run_status,
    run,
  );
  return {
    lines,
    status,
    progress: Number.isFinite(Number(payload?.progress))
      ? Number(payload.progress)
      : status === "running"
        ? 0
        : 100,
    nextAfter:
      payload?.nextAfter ?? payload?.next_after ?? Number(after) + lines.length,
  };
};

export const cancelRun = async (runId) =>
  unwrap(await API.post(`/runs/${runId}/cancel`));
export const rerunRun = async (runId) => {
  const payload = unwrap(await API.post(`/runs/${runId}/rerun`));
  const runIdNew = payload?.runId ?? payload?.run_id ?? payload?.id;
  return { ...payload, runId: runIdNew };
};
export const getRunEvidences = async (runId, resultId) =>
  unwrap(await API.get(`/runs/${runId}/results/${resultId}/evidences`));

export function computeStats(list = []) {
  const finished = list.filter((run) => run.status !== "RUNNING");
  const passed = finished.filter((run) => run.status === "PASSED").length;
  const lastFailed = list.find((run) => run.status === "FAILED") || null;
  return {
    total: list.length,
    passRate: finished.length
      ? Math.round((passed / finished.length) * 100)
      : 0,
    running: list.filter((run) => run.status === "RUNNING").length,
    lastFailed,
  };
}

export function dailyPassFail(list = [], days = 7) {
  const out = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const dayRuns = list.filter((run) => {
      const value = run.createdAt || run.created_at || run.executedAt;
      if (!value || run.status === "RUNNING") return false;
      const parsed = new Date(value);
      const runKey = Number.isNaN(parsed.getTime())
        ? String(value).slice(0, 10)
        : `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
      return runKey === key;
    });
    out.push({
      date: `${date.getDate()}/${date.getMonth() + 1}`,
      Pass: dayRuns.filter((run) => run.status === "PASSED").length,
      Fail: dayRuns.filter((run) => run.status === "FAILED").length,
    });
  }
  return out;
}
