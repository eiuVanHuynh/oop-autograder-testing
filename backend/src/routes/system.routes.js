const router = require('express').Router();
const { setTimeout: delay } = require('node:timers/promises');
const { query } = require('../config/db');

// System health check.
// Full endpoint list: api-endpoints.md section 11 — GET /health, PUBLIC (no requireAuth):
// the callers are the deploy script and the DB connection tests, which have no token.
// Mounted under '/' in routes/index.js, so the real URL is /api/health.
//
// No service of its own: this endpoint is deliberately just a SELECT 1, and any extra layer
// is one more thing that can break and lie about whether the server is alive.

// A health check that waits as long as the DB wants is useless: when Supabase stops answering (its
// commonest failure, not a refused connection) the request hangs until Vercel kills the function, and
// the deploy script reads a timeout instead of "the database is down". Answer 503 ourselves instead.
const DB_TIMEOUT_MS = Number(process.env.HEALTH_DB_TIMEOUT_MS || 2000);

router.get('/health', async (_req, res) => {
  const started = Date.now();
  const stopTimer = new AbortController();

  try {
    await Promise.race([
      query('SELECT 1'),
      delay(DB_TIMEOUT_MS, null, { signal: stopTimer.signal }).then(() => {
        throw new Error(`no answer from the database within ${DB_TIMEOUT_MS}ms`);
      }),
    ]);
    res.status(200).json({
      data: { status: 'ok', db: 'up', dbLatencyMs: Date.now() - started },
    });
  } catch (err) {
    // The old version swallowed this silently, so a 503 left no trace of WHY in the log.
    console.error('[health] database check failed:', err.message);
    // 503, NOT letting errorHandler turn it into a 500: a lost DB is "not ready", not an unknown error.
    res.status(503).json({
      error: { code: 'DB_DOWN', message: 'Cannot connect to the database' },
      data: { status: 'degraded', db: 'down', dbLatencyMs: Date.now() - started },
    });
  } finally {
    // Without this the pending timer keeps the serverless function alive after the response is sent.
    stopTimer.abort();
  }
});

module.exports = router;
