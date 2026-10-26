const AppError = require("../utils/AppError");

// Chốt cuối: đổi mọi lỗi thành { error: { code, message, details? } }.
// Final stop: turns every error into { error: { code, message, details? } }.
// Lỗi lạ (không phải AppError) trả 500 kèm thông điệp chung — không lộ stack ra ngoài.
// An unknown error (not AppError) returns a generic 500 — never leak the stack.
//
// Cần làm / To do:
// - AppError → dùng status/code/details của nó. Còn lại → 500 INTERNAL_ERROR.
// - Vẫn console.error toàn bộ lỗi để xem trên log Vercel.
// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, next) => {
  // Luôn log toàn bộ lỗi để theo dõi trên console/Vercel logs
  console.error(err);

  let statusCode = 500;
  let code = "INTERNAL_ERROR";
  let message = "Internal Server Error";
  let details;

  // Kiểm tra nếu là lỗi do ứng dụng chủ động định nghĩa (AppError)
  if (err instanceof AppError || (err.statusCode && err.message)) {
    statusCode = err.statusCode || err.status || 500;
    code =
      err.code ||
      (statusCode === 400
        ? "BAD_REQUEST"
        : statusCode === 401
          ? "UNAUTHORIZED"
          : statusCode === 403
            ? "FORBIDDEN"
            : statusCode === 404
              ? "NOT_FOUND"
              : statusCode === 409
                ? "CONFLICT"
                : "ERROR");
    message = err.message || message;
    details = err.details;
  }

  const errorObj = {
    code,
    message,
  };

  if (details !== undefined) {
    errorObj.details = details;
  }

  return res.status(statusCode).json({
    error: errorObj,
  });
};
