// Sinh dữ liệu test duy nhất mỗi lần chạy. Quy tắc: docs/test-data-rules.md
const PREFIX = "AUTOTEST";
const IRN_PREFIX = "2099"; // IRN giả, khớp CSV trong automation/fixtures

// 6 số cuối timestamp; gọi 1 lần rồi dùng chung trong cả lần chạy.
const newRunId = () => Date.now().toString().slice(-6);

// IRN 10 chữ số, duy nhất mỗi lần chạy. Có thể truyền irn_prefix lấy từ DB.
const uniqueIrn = (runId = newRunId(), irnPrefix = IRN_PREFIX) => `${irnPrefix}${runId}`;

const autotestName = (base, runId = newRunId()) => `${PREFIX} ${base} ${runId}`;

const autotestEmail = (runId = newRunId(), domain = "@eiu.edu.vn") =>
  `${PREFIX.toLowerCase()}.${runId}${domain}`;

const autotestLab = (runId = newRunId()) => `${PREFIX}_Lab_${runId}`;

module.exports = { PREFIX, IRN_PREFIX, newRunId, uniqueIrn, autotestName, autotestEmail, autotestLab };
