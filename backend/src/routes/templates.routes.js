const router = require("express").Router();
const templateController = require("../controllers/templates.controller");
const {
  createTemplateSchema,
  updateTemplateSchema,
} = require("../validators/templates.schema");
const requireAuth = require("../middlewares/requireAuth");
const requireRole = require("../middlewares/requireRole");
const validate = require("../middlewares/validate");

// Ai được làm gì: api-endpoints.md mục 4.
const canWrite = requireRole("admin", "tester");

// Template – thứ người dùng chọn để chạy (bảng mới test_templates).
// Templates – what the user picks to run (the new test_templates table).
// Endpoint đầy đủ: api-endpoints.md mục 4.
// Full endpoint list: api-endpoints.md section 4.
//
// Cần làm / To do:
// - Mỗi dòng theo đúng thứ tự: requireAuth → requireRole → validate → controller.
// - Route chỉ khai báo URL, không có logic.

// GET /api/templates - Xem danh sách template (Mọi user đăng nhập)
router.get("/", requireAuth, templateController.getTemplates);

// GET /api/templates/:id - Xem chi tiết 1 template (Mọi user đăng nhập)
router.get("/:id", requireAuth, templateController.getTemplateById);

// POST /api/templates - Tạo template mới (Admin, Tester)
router.post(
  "/",
  requireAuth,
  canWrite,
  validate(createTemplateSchema),
  templateController.createTemplate,
);

// PUT /api/templates/:id - Sửa template (Admin, Tester)
router.put(
  "/:id",
  requireAuth,
  canWrite,
  validate(updateTemplateSchema),
  templateController.updateTemplate,
);

// DELETE /api/templates/:id - Xóa template (Admin, Tester)
router.delete("/:id", requireAuth, canWrite, templateController.deleteTemplate);

// POST /api/templates/:id/duplicate - Nhân bản template (Admin, Tester)
router.post(
  "/:id/duplicate",
  requireAuth,
  canWrite,
  templateController.duplicateTemplate,
);

module.exports = router;
