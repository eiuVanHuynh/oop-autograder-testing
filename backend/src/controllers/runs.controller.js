const asyncHandler = require("../utils/asyncHandler");
const { runsService } = require("../config/container");

// Chạy test, theo dõi log, lịch sử, hủy, chạy lại.
// Running tests, log tailing, history, cancel, re-run.
// Controller mỏng: đọc req → gọi service → res.json({ data }). Không có quy tắc nghiệp vụ.

// 1. POST /runs - Bấm "Run Test" (Status code: 202 Accepted)
const createRun = asyncHandler(async (req, res) => {
  const userId = req.user.user_id;
  const result = await runsService.createRun(userId, req.body);
  return res.status(202).json({ data: result });
});

// 2. GET /runs - Danh sách & lịch sử chạy test với bộ lọc (Status code: 200 OK)
const getRuns = asyncHandler(async (req, res) => {
  const filters = {
    q: req.query.q,
    status: req.query.status,
    from: req.query.from,
    to: req.query.to,
    page: req.query.page,
    limit: req.query.limit,
  };
  const result = await runsService.getAllRuns(filters);
  return res.status(200).json(result); // Trả về { data, meta }
});

// 3. GET /runs/:id - Chi tiết 1 lần chạy (Status code: 200 OK)
const getRunById = asyncHandler(async (req, res) => {
  const result = await runsService.getRunById(req.params.id);
  return res.status(200).json({ data: result });
});

// 4. GET /runs/:id/logs?after= - Polling log với tham số after (Status code: 200 OK)
const getRunLogs = asyncHandler(async (req, res) => {
  const after = Number(req.query.after) || 0;
  const result = await runsService.getRunLogs(req.params.id, after);
  return res.status(200).json({ data: result });
});

// 5. GET /runs/:id/logs/stream - Xem log trực tiếp dạng SSE (Status code: 200 OK)
const streamRunLogs = asyncHandler(async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  await runsService.streamRunLogs(req.params.id, res);
});

// 6. POST /runs/:id/cancel - Hủy lần chạy test đang chạy (Status code: 200 OK)
const cancelRun = asyncHandler(async (req, res) => {
  const result = await runsService.cancelRun(req.params.id, req.user.user_id);
  return res.status(200).json({ data: result });
});

// 7. POST /runs/:id/rerun - Chạy lại test bằng cấu hình cũ (Status code: 202 Accepted)
const rerunRun = asyncHandler(async (req, res) => {
  const userId = req.user.user_id;
  const result = await runsService.rerun(req.params.id, userId);
  return res.status(202).json({ data: result });
});

// 8. GET /runs/:id/results/:resultId/evidences - Xem bằng chứng (Status code: 200 OK)
const getEvidences = asyncHandler(async (req, res) => {
  const { id, resultId } = req.params;
  const result = await runsService.getEvidences(id, resultId);
  return res.status(200).json({ data: result });
});

// 9. DELETE /runs/:id - Xóa lần chạy khỏi lịch sử (Status code: 204 No Content)
const deleteRun = asyncHandler(async (req, res) => {
  await runsService.deleteRun(req.params.id);
  return res.status(204).send();
});

module.exports = {
  createRun,
  getRuns,
  getRunById,
  getRunLogs,
  streamRunLogs,
  cancelRun,
  rerunRun,
  getEvidences,
  deleteRun,
};
