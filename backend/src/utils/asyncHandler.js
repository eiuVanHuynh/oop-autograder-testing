// Bọc controller async để lỗi rơi đúng vào errorHandler.
// Wraps an async controller so rejections reach errorHandler.
// Không có nó, một promise bị reject sẽ treo request cho tới khi timeout.
// Without it a rejected promise hangs the request until it times out.
module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
