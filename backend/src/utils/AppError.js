// Lỗi có chủ đích của ứng dụng: errorHandler đọc status + code để trả JSON đúng dạng.
// Deliberate application error: errorHandler reads status + code to shape the JSON reply.
// Lỗi không phải AppError coi như lỗi lập trình → 500, không lộ chi tiết ra ngoài.
// Anything that is not an AppError counts as a bug → 500, with no details leaked.
class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// Cần làm / To do:
// - Thêm các helper hay dùng: notFound(), forbidden(), conflict()… cho gọn chỗ gọi.
module.exports = AppError;
