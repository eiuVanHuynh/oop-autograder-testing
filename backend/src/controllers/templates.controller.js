const asyncHandler = require("../utils/asyncHandler");
const { templatesService } = require("../config/container");

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
    status: req.query.status,
  };
  const data = await templatesService.getAllTemplates(filters);
  // Bỏ success: true theo đúng backend-design.md mục 4[cite: 2]
  return res.status(200).json({ data });
});

const getTemplateById = asyncHandler(async (req, res) => {
  const data = await templatesService.getTemplateById(req.params.id);
  return res.status(200).json({ data });
});

const createTemplate = asyncHandler(async (req, res) => {
  // requireAuth gắn req.user = { user_id, role }.
  const userId = req.user.user_id;
  const data = await templatesService.createTemplate(userId, req.body);
  return res.status(201).json({ data });
});

const updateTemplate = asyncHandler(async (req, res) => {
  const data = await templatesService.updateTemplate(req.params.id, req.body);
  return res.status(200).json({ data });
});

const deleteTemplate = asyncHandler(async (req, res) => {
  await templatesService.deleteTemplate(req.params.id);
  return res.status(204).send();
});

const duplicateTemplate = asyncHandler(async (req, res) => {
  // requireAuth gắn req.user = { user_id, role }.
  const userId = req.user.user_id;
  const data = await templatesService.duplicateTemplate(req.params.id, userId);
  return res.status(201).json({ data });
});

module.exports = {
  getTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
};
