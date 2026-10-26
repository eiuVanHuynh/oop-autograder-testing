const AppError = require('../utils/AppError');

// Chốt cuối: đổi mọi lỗi thành { error: { code, message, details? } }.
// Final stop: turns every error into { error: { code, message, details? } }.
// Lỗi lạ (không phải AppError) trả 500 kèm thông điệp chung — không lộ stack ra ngoài.
// An unknown error (not AppError) returns a generic 500 — never leak the stack.
//
// Cần làm / To do:
// - AppError → dùng status/code/details của nó. Còn lại → 500 INTERNAL_ERROR.
// - Log stack chỉ cho lỗi lạ và 5xx; AppError 4xx là phản hồi bình thường, không log.
// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, next) => {
  // Chỉ log stack cho lỗi KHÔNG lường trước. AppError 4xx là phản hồi bình thường
  // (sai mật khẩu, thiếu quyền, body sai) — log stack cho chúng chỉ làm ngập log Vercel.
  if (!(err instanceof AppError) || err.status >= 500) {
    console.error(err);
  }

  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  // Service hiện throw Error kèm statusCode thay vì AppError — vẫn tôn trọng status đó.
  if (err.statusCode) {
    return res
      .status(err.statusCode)
      .json({ error: { code: err.code || 'ERROR', message: err.message } });
  }

  return res
    .status(500)
    .json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
};
