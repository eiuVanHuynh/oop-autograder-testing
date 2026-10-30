const asyncHandler = require("../utils/asyncHandler");
const { ingestService } = require("../config/container");

// Cửa sau cho máy: Playwright đẩy kết quả và log về.
// Controller mỏng: đọc req → gọi service → res.json({ data }). Không có quy tắc nghiệp vụ.

// GET /ingest/runs/:id/plan - CI lấy danh sách case kèm bước + dữ liệu (một lần gọi)
const getPlan = asyncHandler(async (req, res) => {
  const data = await ingestService.getPlan(req.params.id);
  return res.status(200).json({ data });
});

// POST /ingest/runs/:id/logs - Đẩy log theo lô khi đang chạy
const addLogs = asyncHandler(async (req, res) => {
  const data = await ingestService.addLogs(req.params.id, req.body.lines);
  return res.status(202).json({ data });
});

// POST /ingest/runs/:id/results - Đẩy kết quả từng test case
const addResults = asyncHandler(async (req, res) => {
  const data = await ingestService.addResults(req.params.id, req.body.results);
  return res.status(201).json({ data });
});

// PATCH /ingest/runs/:id/finish - Báo đã chạy xong
const finish = asyncHandler(async (req, res) => {
  const data = await ingestService.finish(req.params.id, req.body.final_status ?? null);
  return res.status(200).json({ data });
});

// POST /ingest/runs/:id/ci-run-id - CI báo GITHUB_RUN_ID để backend hủy được workflow
const setCiRunId = asyncHandler(async (req, res) => {
  const data = await ingestService.setCiRunId(req.params.id, req.body.ciRunId);
  return res.status(200).json({ data });
});

module.exports = { getPlan, addLogs, addResults, finish, setCiRunId };
