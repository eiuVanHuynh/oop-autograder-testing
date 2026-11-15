// Dashboard metrics.
// Business rules live here. No pg require, no touching req/res.
// Takes repositories through the constructor so tests can swap in fakes.
//
// To do:
// - Compute the total run count, pass rate, how many are running, and the latest failure.
// - The run status must be computed, not read from a run_status column (there is none).
class StatsService {
  constructor(deps = {}) {
    // TODO: take the repositories it needs from config/container.js
  }

  // TODO
}

module.exports = StatsService;
