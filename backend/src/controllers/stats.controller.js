const asyncHandler = require("../utils/asyncHandler");

// Dashboard metrics.
// Thin controller: read req → call service → res.json({ data }). No business rules.
//
// To do:
// - GET /stats/summary and /stats/daily?days=7. An invalid days → 400.
// - Return the status codes listed in api-endpoints.md section 3.

// TODO: handlers, wrapped in asyncHandler

module.exports = {};
