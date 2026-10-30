const router = require('express').Router();
const metaController = require('../controllers/meta.controller');
const requireAuth = require('../middlewares/requireAuth');

// Các lựa chọn có sẵn cho giao diện (api-endpoints.md mục 12).
// Route chỉ khai báo URL, không có logic.

// GET /api/meta/options – môi trường, priority, test_type, test_status… (mọi user đăng nhập)
router.get('/options', requireAuth, metaController.getOptions);

module.exports = router;
