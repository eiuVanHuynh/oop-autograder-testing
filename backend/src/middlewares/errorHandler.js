const AppError = require('../utils/AppError');

// Final gate: turn every error into { error: { code, message, details? } }.
// An unknown error (not AppError) returns 500 with a generic message — no stack leaked.
//
// To do:
// - AppError → use its status/code/details. Anything else → 500 INTERNAL_ERROR.
// - Log the stack only for unknown errors and 5xx; a 4xx AppError is a normal response, do not log it.
// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, next) => {
  // Log the stack only for UNEXPECTED errors. A 4xx AppError is a normal response
  // (wrong password, missing permission, bad body) — logging their stacks just floods the Vercel log.
  if (!(err instanceof AppError) || err.status >= 500) {
    console.error(`[${req.method} ${req.originalUrl}]`, err);
  }

  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  // Services currently throw Error with statusCode instead of AppError — still honour that status.
  if (err.statusCode) {
    return res
      .status(err.statusCode)
      .json({ error: { code: err.code || 'ERROR', message: err.message } });
  }

  return res
    .status(500)
    .json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
};
