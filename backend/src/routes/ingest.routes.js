const router = require('express').Router();
const ingestController = require('../controllers/ingest.controller');
const requireApiKey = require('../middlewares/requireApiKey');
const validate = require('../middlewares/validate');
const {
  addResultsSchema, addLogsSchema, finishSchema, setCiRunIdSchema,
} = require('../validators/ingest.schema');

// Cửa sau cho máy: Playwright đẩy kết quả và log về.
// Endpoint đầy đủ: api-endpoints.md mục 8.
// Mỗi dòng theo đúng thứ tự: requireApiKey → validate → controller. Route không có logic.
// Cả nhóm dùng x-api-key, KHÔNG dùng requireAuth: máy không có JWT.
router.use(requireApiKey);

// GET /api/ingest/runs/:id/plan - Lấy kế hoạch chạy (case + bước + dữ liệu)
router.get('/runs/:id/plan', ingestController.getPlan);

// POST /api/ingest/runs/:id/ci-run-id - Báo GITHUB_RUN_ID về để hủy được
router.post('/runs/:id/ci-run-id', validate(setCiRunIdSchema), ingestController.setCiRunId);

// POST /api/ingest/runs/:id/logs - Đẩy log theo lô
router.post('/runs/:id/logs', validate(addLogsSchema), ingestController.addLogs);

// POST /api/ingest/runs/:id/results - Đẩy kết quả từng test case
router.post('/runs/:id/results', validate(addResultsSchema), ingestController.addResults);

// PATCH /api/ingest/runs/:id/finish - Báo đã chạy xong
router.patch('/runs/:id/finish', validate(finishSchema), ingestController.finish);

// Bằng chứng (screenshot/trace) cố ý chưa làm: chốt là để test_evidences rỗng ở bản này.
// POST /api/ingest/results/:id/evidences

module.exports = router;
