const { z } = require("zod");
const { RERUN_REQUEST_STATUSES, lowerEnum } = require("./options");

// Zod schemas for the rerun-requests group; the validate() middleware uses them.
// The body carries nothing but an optional note: WHAT gets rerun comes from the old run's config,
// never from the client — a Dev must not be able to turn the request into a different run.
const createRerunRequestSchema = z
  .object({ reason: z.string().trim().max(500).nullable().optional() })
  .strict();

const rerunRequestQuerySchema = z
  .object({ status: lowerEnum(RERUN_REQUEST_STATUSES).optional() })
  .strip(); // query: unknown params are dropped, not a 400 (see catalog.schema.js)

const idParamsSchema = z.object({ id: z.coerce.number().int().positive() });

module.exports = { createRerunRequestSchema, rerunRequestQuerySchema, idParamsSchema };
