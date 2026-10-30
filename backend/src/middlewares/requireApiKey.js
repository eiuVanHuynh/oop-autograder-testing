const crypto = require('crypto');
const { INGEST_API_KEY } = require('../config/env');
const AppError = require('../utils/AppError');

// Cửa riêng cho /ingest/*: GitHub Actions gọi vào, không phải người dùng.
// Separate gate for /ingest/*: called by GitHub Actions, not by a human.
// Không dùng requireAuth ở nhóm này: máy không có JWT.

// So sánh chống đo thời gian. Khác độ dài thì timingSafeEqual ném lỗi, nên băm trước
// để hai bên luôn cùng 32 byte — độ dài khóa cũng không bị suy ra từ thời gian trả lời.
const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest();

module.exports = (req, res, next) => {
  if (!INGEST_API_KEY) {
    return next(new AppError(500, 'NOT_CONFIGURED', 'Server chưa cấu hình INGEST_API_KEY'));
  }
  const given = req.headers['x-api-key'];
  if (!given || !crypto.timingSafeEqual(sha256(given), sha256(INGEST_API_KEY))) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Thiếu hoặc sai header x-api-key'));
  }
  return next();
};
