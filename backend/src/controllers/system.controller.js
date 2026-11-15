const asyncHandler = require("../utils/asyncHandler");

// System health check.
// Thin controller: read req → call service → res.json({ data }). No business rules.
//
// To do:
// - GET /health: 200 when server and DB are both fine, 503 when the DB is unreachable.
// - Return the status codes listed in api-endpoints.md section 11.

// TODO: handlers, wrapped in asyncHandler

module.exports = {};
