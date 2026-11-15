const router = require('express').Router();
const { query } = require('../config/db');

// System health check.
// Full endpoint list: api-endpoints.md section 11 — GET /health, PUBLIC (no requireAuth):
// the callers are the deploy script and the DB connection tests, which have no token.
// Mounted under '/' in routes/index.js, so the real URL is /api/health.
//
// No service of its own: this endpoint is deliberately just a SELECT 1, and any extra layer
// is one more thing that can break and lie about whether the server is alive.
router.get('/health', async (_req, res) => {
  try {
    await query('SELECT 1');
    res.status(200).json({ data: { status: 'ok', db: 'up' } });
  } catch (err) {
    // 503, NOT letting errorHandler turn it into a 500: a lost DB is "not ready", not an unknown error.
    res.status(503).json({
      error: { code: 'DB_DOWN', message: 'Cannot connect to the database' },
      data: { status: 'degraded', db: 'down' },
    });
  }
});

module.exports = router;
