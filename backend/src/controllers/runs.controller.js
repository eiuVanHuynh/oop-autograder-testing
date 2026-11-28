const asyncHandler = require("../utils/asyncHandler");
const { runsService } = require("../config/container");

// Run tests, follow logs, history, cancel, rerun.
// Thin controller: read req → call service → res.json({ data }). No business rules.

// 1. POST /runs - Press "Run Test" (Status code: 202 Accepted)
const createRun = asyncHandler(async (req, res) => {
  const userId = req.user.user_id;
  const result = await runsService.createRun(userId, req.body);
  return res.status(202).json({ data: result });
});

// 2. GET /runs - Test run list & history with filters (Status code: 200 OK)
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
  return res.status(200).json(result); // Returns { data, meta }
});

// 3. GET /runs/:id - Details of one run (Status code: 200 OK)
const getRunById = asyncHandler(async (req, res) => {
  const result = await runsService.getRunById(req.params.id);
  return res.status(200).json({ data: result });
});

// 4. GET /runs/:id/logs?after= - Poll logs with the after parameter (Status code: 200 OK)
const getRunLogs = asyncHandler(async (req, res) => {
  const after = Number(req.query.after) || 0;
  const result = await runsService.getRunLogs(req.params.id, after);
  return res.status(200).json({ data: result });
});

// 4b. GET /runs/:id/results - Per-test-case results of the run (Status code: 200 OK)
const getRunResults = asyncHandler(async (req, res) => {
  const result = await runsService.getRunResults(req.params.id);
  return res.status(200).json({ data: result });
});

// 4c. GET /runs/:id/results/:resultId/evidences - Screenshot / trace of one result (200, 404)
const getResultEvidences = asyncHandler(async (req, res) => {
  const data = await runsService.getResultEvidences(req.params.id, req.params.resultId);
  return res.status(200).json({ data });
});

// 4d. GET /evidences/:token - The evidence file itself (200, 401, 403, 404). Not JSON: raw bytes.
// private, not public: the file is behind a login, so no shared proxy or CDN may keep a copy.
// immutable: a token points at one file forever, so the browser can keep its own copy.
const serveEvidence = asyncHandler(async (req, res) => {
  const { content, mime_type: mime } = await runsService.getEvidenceFile(req.params.token);
  res.setHeader("Content-Type", mime || "application/octet-stream");
  res.setHeader("Cache-Control", "private, max-age=31536000, immutable");
  // nosniff: the bytes come from CI, and a browser guessing "HTML" out of them would run it on our origin.
  res.setHeader("X-Content-Type-Options", "nosniff");
  return res.status(200).send(content);
});

// 6. POST /runs/:id/cancel - Cancel a running test run (Status code: 200 OK)
const cancelRun = asyncHandler(async (req, res) => {
  const result = await runsService.cancelRun(req.params.id, req.user.user_id);
  return res.status(200).json({ data: result });
});

// 7. POST /runs/:id/rerun - Rerun with the previous configuration (Status code: 202 Accepted)
const rerunRun = asyncHandler(async (req, res) => {
  const userId = req.user.user_id;
  const result = await runsService.rerun(req.params.id, userId);
  return res.status(202).json({ data: result });
});

module.exports = {
  createRun,
  getRuns,
  getRunById,
  getRunLogs,
  getRunResults,
  getResultEvidences,
  serveEvidence,
  cancelRun,
  rerunRun,
};
