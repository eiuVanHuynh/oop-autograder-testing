const asyncHandler = require("../utils/asyncHandler");
const templateService = require("../services/templates.service");

// Template – thứ người dùng chọn để chạy (bảng mới test_templates).
// Templates – what the user picks to run (the new test_templates table).
// Controller mỏng: đọc req → gọi service → res.json({ data }). Không có quy tắc nghiệp vụ.
// Thin controller: read req → call the service → res.json({ data }). No business rules here.
//
// Cần làm / To do:
// - CRUD + duplicate. Viewer chỉ được GET.
// - Trả đúng status code ghi trong api-endpoints.md mục 4.

const getTemplates = asyncHandler(async (req, res) => {
  const filters = {
    q: req.query.q,
    scope: req.query.scope,
  };
  const data = await templateService.getAllTemplates(filters);
  return res.status(200).json({ success: true, data });
});

const getTemplateById = asyncHandler(async (req, res) => {
  const data = await templateService.getTemplateById(req.params.id);
  return res.status(200).json({ success: true, data });
});

const createTemplate = asyncHandler(async (req, res) => {
  const userId = req.user ? req.user.user_id : 1;
  const data = await templateService.createTemplate(userId, req.body);
  return res.status(201).json({ success: true, data });
});

const updateTemplate = asyncHandler(async (req, res) => {
  const data = await templateService.updateTemplate(req.params.id, req.body);
  return res.status(200).json({ success: true, data });
});

const deleteTemplate = asyncHandler(async (req, res) => {
  await templateService.deleteTemplate(req.params.id);
  return res.status(204).send();
});

const duplicateTemplate = asyncHandler(async (req, res) => {
  const userId = req.user ? req.user.user_id : 1;
  const data = await templateService.duplicateTemplate(req.params.id, userId);
  return res.status(201).json({ success: true, data });
});

module.exports = {
  getTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
};
