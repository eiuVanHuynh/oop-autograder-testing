// Bóc kết quả TỪNG test case ra khỏi log của một lần chạy.
//
// shortcut: không có GET nào trả test_results (routes/runs.routes.js chỉ có run + logs;
// /reports và /stats là route rỗng), nên pass/fail từng case phải đọc từ log.
// Bỏ file này khi backend mở route đọc test_results.
//
// Khuôn dòng log do hai bộ chạy test tự in ra, giống nhau ở cả hai:
//   backend/src/services/runner/PlaywrightRunner.js  -> "[PLAYWRIGHT] TC-01 failed (12043ms): ..."
//   automation/reporters/push-to-backend.js          -> "[CI] TC-01 failed (12043ms): ..."
// fetchRunLogs còn thêm tiền tố mức log ở đầu, nên dòng đầy đủ là
//   "[ERROR] [CI] TC-01 failed (12043ms): ..."
// Vì vậy regex KHÔNG neo đầu dòng.
//
// Sửa thông điệp log ở hai file trên mà quên file này thì giao diện lặng lẽ mất cột trạng thái,
// nên check-runlog giữ lại đúng hai khuôn đó.
const LINE_RE =
  /\[(?:PLAYWRIGHT|CI)\]\s+(TC-[\w-]+)\s+(passed|failed|timedOut|skipped|interrupted)\s*\((\d+)ms\)(?::\s*([\s\S]*))?$/;

// Trả Map: tc_code (chữ HOA) -> { status, ms, error }.
// Playwright retry thì in nhiều dòng cho cùng một case; dòng sau đè dòng trước, đúng như
// test_results chỉ giữ lần chạy cuối.
export function parseCaseResults(logs = []) {
  const out = new Map();
  for (const line of logs) {
    const m = LINE_RE.exec(String(line).trim());
    if (!m) continue;
    const [, code, status, ms, error] = m;
    out.set(code.toUpperCase(), {
      status: status.toUpperCase(),
      ms: Number(ms),
      error: error?.trim() || null,
    });
  }
  return out;
}

// Mili-giây -> chuỗi ngắn cho bảng. null khi chưa có số.
export const msLabel = (ms) =>
  typeof ms === "number" && Number.isFinite(ms) ? `${(ms / 1000).toFixed(1)}s` : null;

// Màu chữ theo mức log, dùng chung cho trang Run Test và trang báo cáo.
// fetchRunLogs chuẩn hoá tiền tố thành "[INFO] " / "[WARN] " / "[ERROR] ", nên bắt theo
// tiền tố chứ KHÔNG dò chữ trong nội dung: dò nội dung thì một thông báo lỗi có chứa
// chữ "warn" sẽ bị tô nhầm.
export const logTone = (line) =>
  String(line).startsWith("[ERROR]")
    ? "text-red-600"
    : String(line).startsWith("[WARN]")
      ? "text-amber-600"
      : "text-gray-600";
