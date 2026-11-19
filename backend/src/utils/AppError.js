// Deliberate application error: errorHandler reads status + code to shape the JSON response.
// A non-AppError counts as a programming bug → 500, with no details leaked.
class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// To do:
// - Add the common helpers: notFound(), forbidden(), conflict()… to shorten call sites.
module.exports = AppError;
