const asyncHandler = require('../utils/asyncHandler');
const { bugsService } = require('../config/container');

// Report a bug from a failed test result (🟡).
// Thin controller: read req → call service → res.json({ data }). No business rules.

// 1. POST /results/:id/bugs (201; 409 if the result is not a Fail)
const createBug = asyncHandler(async (req, res) => {
  const bug = await bugsService.createForResult(req.params.id, req.body, req.user.user_id);
  return res.status(201).json({ data: bug });
});

// 2. GET /bugs?status=&severity= (200)
const getBugs = asyncHandler(async (req, res) => {
  return res.status(200).json({ data: await bugsService.getBugs(req.query) });
});

// 3. PATCH /bugs/:id (200)
const updateBug = asyncHandler(async (req, res) => {
  return res.status(200).json({ data: await bugsService.updateBug(req.params.id, req.body) });
});

module.exports = { createBug, getBugs, updateBug };
