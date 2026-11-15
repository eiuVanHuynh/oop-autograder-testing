const asyncHandler = require("../utils/asyncHandler");
const { templatesService } = require("../config/container");

// Template – what the user picks to run (new test_templates table).
// Thin controller: read req → call service → res.json({ data }). No business rules.
//
// To do:
// - CRUD + duplicate. Viewer may only GET.
// - Return the status codes listed in api-endpoints.md section 4.

const getTemplates = asyncHandler(async (req, res) => {
  const filters = {
    q: req.query.q,
    scope: req.query.scope,
    status: req.query.status,
  };
  const data = await templatesService.getAllTemplates(filters);
  // Dropped success: true as per backend-design.md section 4[cite: 2]
  return res.status(200).json({ data });
});

const getTemplateById = asyncHandler(async (req, res) => {
  const data = await templatesService.getTemplateById(req.params.id);
  return res.status(200).json({ data });
});

const createTemplate = asyncHandler(async (req, res) => {
  // requireAuth sets req.user = { user_id, role }.
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
  // requireAuth sets req.user = { user_id, role }.
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
