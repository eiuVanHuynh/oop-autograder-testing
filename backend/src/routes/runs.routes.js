const router = require("express").Router();
const runsController = require("../controllers/runs.controller");
const { validateCreateRun } = require("../validators/runs.schema");
// const { verifyToken, requireRole } = require('../middlewares/auth.middleware'); // Bật lên khi tích hợp middleware chính thức

// Chạy test, theo dõi log, lịch sử, hủy, chạy lại.
// Running tests, log tailing, history, cancel, re-run.
// Endpoint đầy đủ: api-endpoints.md mục 6.
// Full endpoint list: api-endpoints.md section 6.
//
// Cần làm / To do:
// - Mỗi dòng theo đúng thứ tự: requireAuth → requireRole → validate → controller.
// - Route chỉ khai báo URL, không có logic.

// GET /api/runs - Xem lịch sử chạy test (Mọi user)
router.get("/", runsController.getRuns);

// GET /api/runs/:id - Xem chi tiết 1 lần chạy (Mọi user)
router.get("/:id", runsController.getRunById);

// POST /api/runs - Bấm "Run Test" tạo lần chạy mới (Admin, Tester)
router.post("/", validateCreateRun, runsController.createRun);

// GET /api/runs/:id/logs/stream - Xem log trực tiếp qua SSE (Mọi user)
router.get("/:id/logs/stream", runsController.streamRunLogs);

// GET /api/runs/:id/logs - Xem log dự phòng theo phân đoạn after (Mọi user)
router.get("/:id/logs", runsController.getRunLogs);

// POST /api/runs/:id/cancel - Hủy test đang chạy (Admin, Tester)
router.post("/:id/cancel", runsController.cancelRun);

// POST /api/runs/:id/rerun - Chạy lại test dựa trên config cũ (Admin, Tester)
router.post("/:id/rerun", runsController.rerunRun);

// GET /api/runs/:id/results/:resultId/evidences - Xem bằng chứng/screenshot của bước (Mọi user)
// Đã sửa getRunEvidences thành getEvidences cho khớp với runs.controller.js
router.get("/:id/results/:resultId/evidences", runsController.getEvidences);

module.exports = router;
