const router = require('express').Router();

// Export PDF/HTML reports and share links.
// Full endpoint list: api-endpoints.md section 7.
//
// To do:
// - Every line in this order: requireAuth → requireRole → validate → controller.
// - A route only declares the URL, it holds no logic.

// TODO: declare the routes of the reports group

module.exports = router;
