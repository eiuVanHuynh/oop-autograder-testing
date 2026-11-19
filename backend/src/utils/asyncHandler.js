// Wrap an async controller so its errors land in errorHandler.
// Without it, a rejected promise hangs the request until timeout.
module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
