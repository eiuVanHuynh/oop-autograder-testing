const asyncHandler = require("../utils/asyncHandler");
const { rerunRequestsService } = require("../config/container");

// Dev asks for a rerun, Admin/Tester decides (issue #97).
// Thin controller: read req → call service → res.json({ data }). No business rules.

// 1. POST /runs/:id/rerun-requests (201; 404 unknown run; 409 one is already pending)
const createRequest = asyncHandler(async (req, res) => {
  const data = await rerunRequestsService.createForRun(req.params.id, req.body, req.user.user_id);
  return res.status(201).json({ data });
});

// 2. GET /rerun-requests?status= (200)
const getRequests = asyncHandler(async (req, res) => {
  return res.status(200).json({ data: await rerunRequestsService.getRequests(req.query) });
});

// 3. POST /rerun-requests/:id/approve (200)
const approveRequest = asyncHandler(async (req, res) => {
  const data = await rerunRequestsService.decide(req.params.id, "approved", req.user.user_id);
  return res.status(200).json({ data });
});

// 4. POST /rerun-requests/:id/reject (200)
const rejectRequest = asyncHandler(async (req, res) => {
  const data = await rerunRequestsService.decide(req.params.id, "rejected", req.user.user_id);
  return res.status(200).json({ data });
});

// 5. PATCH /rerun-requests/:id (200) — Admin đặt lại trạng thái, kể cả về PENDING
const setStatus = asyncHandler(async (req, res) => {
  const data = await rerunRequestsService.setStatus(req.params.id, req.body.status, req.user.user_id);
  return res.status(200).json({ data });
});

module.exports = { createRequest, getRequests, approveRequest, rejectRequest, setStatus };
