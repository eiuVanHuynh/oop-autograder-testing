const asyncHandler = require("../utils/asyncHandler");
const { ingestService } = require("../config/container");
const { PUBLIC_API_URL } = require("../config/env");

// URL gốc để dựng link bằng chứng. Ưu tiên biến môi trường vì đó là URL người dùng thật sự mở;
// sau proxy của Vercel thì req.get('host') có thể là host nội bộ (app.js đã bật 'trust proxy').
const publicBase = (req) => PUBLIC_API_URL || `${req.protocol}://${req.get("host")}`;

// Back door for machines: Playwright pushes results and logs back.
// Thin controller: read req → call service → res.json({ data }). No business rules.

// GET /ingest/runs/:id/plan - CI fetches the case list with steps + data (a single call)
const getPlan = asyncHandler(async (req, res) => {
  const data = await ingestService.getPlan(req.params.id);
  return res.status(200).json({ data });
});

// POST /ingest/runs/:id/logs - Push logs in batches while running
const addLogs = asyncHandler(async (req, res) => {
  const data = await ingestService.addLogs(req.params.id, req.body.lines);
  return res.status(202).json({ data });
});

// POST /ingest/runs/:id/results - Push the result of each test case
const addResults = asyncHandler(async (req, res) => {
  const data = await ingestService.addResults(req.params.id, req.body.results);
  return res.status(201).json({ data });
});

// PATCH /ingest/runs/:id/finish - Report that the run has finished
const finish = asyncHandler(async (req, res) => {
  const data = await ingestService.finish(req.params.id, req.body.final_status ?? null);
  return res.status(200).json({ data });
});

// POST /ingest/results/:id/evidences - Push screenshots/traces of one result (bytes or just a location)
const addEvidences = asyncHandler(async (req, res) => {
  const data = await ingestService.addEvidences(req.params.id, req.body.evidences, publicBase(req));
  return res.status(201).json({ data });
});

// POST /ingest/runs/:id/ci-run-id - CI reports GITHUB_RUN_ID so the backend can cancel the workflow
const setCiRunId = asyncHandler(async (req, res) => {
  const data = await ingestService.setCiRunId(req.params.id, req.body.ciRunId);
  return res.status(200).json({ data });
});

module.exports = { getPlan, addLogs, addResults, finish, setCiRunId, addEvidences };
