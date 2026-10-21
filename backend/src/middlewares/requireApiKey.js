// Cửa riêng cho /ingest/*: GitHub Actions gọi vào, không phải người dùng.
// Separate gate for /ingest/*: called by GitHub Actions, not by a human.
//
// Cần làm / To do:
// - So sánh header x-api-key với INGEST_API_KEY; sai hoặc thiếu → 401.
// - So sánh theo kiểu chống đo thời gian (crypto.timingSafeEqual).
// - Không dùng requireAuth ở nhóm này: máy không có JWT.
module.exports = (req, res, next) => {
  // TODO
};
