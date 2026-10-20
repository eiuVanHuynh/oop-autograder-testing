const AppError = require('../utils/AppError');

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
  // TODO
};
