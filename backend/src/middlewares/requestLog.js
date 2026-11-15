// One compact line per request. Mounted first so it also sees requests that 404 in the router.
// Failures only get this line here; errorHandler prints the stack for unknown errors and 5xx.
// Muted in tests so `npm test` output stays readable. NODE_TEST_CONTEXT is set by `node --test`
// itself, which keeps the npm script portable (NODE_ENV=test in it would break cmd.exe).
module.exports = (req, res, next) => {
  if (process.env.NODE_TEST_CONTEXT || process.env.NODE_ENV === 'test') return next();
  const start = Date.now();
  res.on('finish', () =>
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`),
  );
  next();
};
