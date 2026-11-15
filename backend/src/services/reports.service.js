// Export PDF/HTML reports and share links.
// Business rules live here. No pg require, no touching req/res.
// Takes repositories through the constructor so tests can swap in fakes.
//
// To do:
// - Reuse the logic from automation/scripts/export-report.js, do not rewrite it.
// - Vercel can only write to /tmp → stream straight back to the client.
// - Run not finished → 409. Expired share link → 410.
class ReportsService {
  constructor(deps = {}) {
    // TODO: take the repositories it needs from config/container.js
  }

  // TODO
}

module.exports = ReportsService;
