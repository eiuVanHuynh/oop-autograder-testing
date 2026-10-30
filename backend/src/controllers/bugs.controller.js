const asyncHandler = require('../utils/asyncHandler');
const { bugsService } = require('../config/container');

// Báo lỗi từ một kết quả test bị Fail (🟡).
// Controller mỏng: đọc req → gọi service → res.json({ data }). Không có quy tắc nghiệp vụ.

// 1. POST /results/:id/bugs (201; 409 nếu kết quả không phải Fail)
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
