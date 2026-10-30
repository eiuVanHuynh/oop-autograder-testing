const router = require("express").Router();
const runsController = require("../controllers/runs.controller");
const {
  createRunSchema,
  runIdParamsSchema,
} = require("../validators/runs.schema");
const requireAuth = require("../middlewares/requireAuth");
const requireRole = require("../middlewares/requireRole");
const validate = require("../middlewares/validate");

// Ai được làm gì: api-endpoints.md mục 6. Dev/viewer không được chạy test.
const canRun = requireRole("admin", "tester");
const validateId = validate(runIdParamsSchema, "params");

// Chạy test, theo dõi log, lịch sử, hủy, chạy lại.
// Running tests, log tailing, history, cancel, re-run.
// Endpoint đầy đủ: api-endpoints.md mục 6.
// Full endpoint list: api-endpoints.md section 6.
//
// Cần làm / To do:
// - Mỗi dòng theo đúng thứ tự: requireAuth → requireRole → validate → controller.
// - Route chỉ khai báo URL, không có logic.

// GET /api/runs - Xem lịch sử chạy test (Mọi user đăng nhập)
router.get("/", requireAuth, runsController.getRuns);

// GET /api/runs/:id - Xem chi tiết 1 lần chạy (Mọi user đăng nhập)
router.get("/:id", requireAuth, validateId, runsController.getRunById);

// POST /api/runs - Bấm "Run Test" tạo lần chạy mới (Admin, Tester)
router.post(
  "/",
  requireAuth,
  canRun,
  validate(createRunSchema),
  runsController.createRun,
);

// POST /api/runs/:id/cancel - Hủy test đang chạy (Admin, Tester)
router.post("/:id/cancel", requireAuth, canRun, validateId, runsController.cancelRun);

// POST /api/runs/:id/rerun - Chạy lại test dựa trên config cũ (Admin, Tester)
router.post("/:id/rerun", requireAuth, canRun, validateId, runsController.rerunRun);

// GET /api/runs/:id/logs?after= - Polling log theo seq (Mọi user đăng nhập)
router.get("/:id/logs", requireAuth, validateId, runsController.getRunLogs);

// GET /api/runs/:id/results - Kết quả từng test case, kèm evidences (Mọi user đăng nhập)
router.get("/:id/results", requireAuth, validateId, runsController.getRunResults);

// shortcut: route dưới đây còn tắt vì runs.service.js chưa có streamRunLogs — gắn vào là 500
// ngay lần gọi đầu. Bỏ // khi service có hàm đó (polling /logs vẫn chạy bình thường).
// GET /api/runs/:id/logs/stream - Xem log trực tiếp qua SSE (Mọi user)
// router.get("/:id/logs/stream", requireAuth, runsController.streamRunLogs);
//
// Không cần route evidences riêng: GET /:id/results đã trả kèm mảng evidences của từng case.

module.exports = router;
