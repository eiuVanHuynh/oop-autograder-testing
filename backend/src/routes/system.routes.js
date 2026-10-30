const router = require('express').Router();
const { query } = require('../config/db');

// Kiểm tra sức khỏe hệ thống.
// System health check.
// Endpoint đầy đủ: api-endpoints.md mục 11 — GET /health, CÔNG KHAI (không requireAuth):
// nơi gọi là script deploy và bộ test kết nối DB, chúng không có token.
// Mount ở routes/index.js dưới '/' nên URL thật là /api/health.
//
// Không có service riêng: endpoint này cố tình chỉ gồm một câu SELECT 1, mọi lớp thêm vào
// đều là thứ có thể tự hỏng và làm sai câu trả lời "server còn sống không".
router.get('/health', async (_req, res) => {
  try {
    await query('SELECT 1');
    res.status(200).json({ data: { status: 'ok', db: 'up' } });
  } catch (err) {
    // 503, KHÔNG để errorHandler biến thành 500: mất DB là "chưa sẵn sàng", không phải lỗi lạ.
    res.status(503).json({
      error: { code: 'DB_DOWN', message: 'Không kết nối được Database' },
      data: { status: 'degraded', db: 'down' },
    });
  }
});

module.exports = router;
