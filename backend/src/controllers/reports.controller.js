const asyncHandler = require("../utils/asyncHandler");

// Export PDF/HTML reports and share links.
// Thin controller: read req → call service → res.json({ data }). No business rules.
//
// To do:
// - GET /runs/:id/export?format=, POST /runs/export (several runs → .zip), share + GET /share/:token.
// - Return the status codes listed in api-endpoints.md section 7.

// TODO: handlers, wrapped in asyncHandler

module.exports = {};
