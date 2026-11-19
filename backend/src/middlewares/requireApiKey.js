const crypto = require('crypto');
const { INGEST_API_KEY } = require('../config/env');
const AppError = require('../utils/AppError');

// Dedicated gate for /ingest/*: called by GitHub Actions, not by users.
// requireAuth is not used for this group: a machine has no JWT.

// Timing-safe comparison. Different lengths make timingSafeEqual throw, so hash first
// to keep both sides at 32 bytes — the key length cannot be inferred from response time either.
const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest();

module.exports = (req, res, next) => {
  if (!INGEST_API_KEY) {
    return next(new AppError(500, 'NOT_CONFIGURED', 'Server has no INGEST_API_KEY configured'));
  }
  const given = req.headers['x-api-key'];
  if (!given || !crypto.timingSafeEqual(sha256(given), sha256(INGEST_API_KEY))) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Missing or wrong x-api-key header'));
  }
  return next();
};
