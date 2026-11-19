// System health check.
// Business rules live here. No pg require, no touching req/res.
// Takes repositories through the constructor so tests can swap in fakes.
//
// To do:
// - Run a real SELECT 1 through the repository/db, do not just hard-code a 200.
class SystemService {
  constructor(deps = {}) {
    // TODO: take the repositories it needs from config/container.js
  }

  // TODO
}

module.exports = SystemService;
