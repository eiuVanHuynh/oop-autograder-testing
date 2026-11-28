const router = require('express').Router();
const runsController = require('../controllers/runs.controller');
const requireAuth = require('../middlewares/requireAuth');
const requireRole = require('../middlewares/requireRole');
const validate = require('../middlewares/validate');
const { evidenceTokenParamsSchema } = require('../validators/runs.schema');

// GET /api/evidences/:token - Ảnh/trace của một kết quả test. Phải đăng nhập, từ dev trở lên.
// Full endpoint list: api-endpoints.md section 6.
//
// Ảnh chụp màn hình có thể chứa dữ liệu thật của người dùng (tên, email, nội dung bài nộp), nên nó
// đi theo đúng quyền như mọi dữ liệu khác chứ không dựa vào "token khó đoán". viewer bị loại: vai trò
// đó chỉ đọc số liệu tổng hợp.
//
// Hệ quả: thẻ <img src="..."> KHÔNG tải được nữa (không gửi kèm Authorization). Frontend phải tải
// bằng API rồi nhúng dạng data: URL — xem services/runService.js (getEvidenceDataUrl). Token vẫn giữ
// vì nó là khóa tra cứu một file, nhưng nó không còn là thứ bảo vệ file.
//
// Nhóm riêng vì runs.routes mount ở /runs mà URL này phải nằm ngoài; controller/service thì dùng lại
// của runs (bằng chứng vẫn thuộc về một lần chạy).
router.get(
  '/:token',
  requireAuth,
  requireRole('admin', 'tester', 'dev'),
  validate(evidenceTokenParamsSchema, 'params'),
  runsController.serveEvidence,
);

module.exports = router;
