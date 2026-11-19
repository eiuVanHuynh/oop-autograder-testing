const { Pool } = require("pg");
require("dotenv").config();

// Singleton: the whole process shares one pool. Vercel serverless reuses the
// container, so creating a new pool per request would exhaust PostgreSQL connections.
//
// Only repositories/ may require this file. Services never touch it.
let pool;

const getPool = () => {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // Small (1-5) to stay under the connection limit of the cloud DB,
      // matching the note in automation/tests/utils/db-client.js
      max: Number(process.env.DB_POOL_SIZE || 5),
      // Supabase requires SSL; local Postgres usually does not. Same DB_SSL convention.
      ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: true } : undefined,
    });
  }
  return pool;
};

// Returns pg's result object as-is: read via .rows, write via .rowCount.
const brief = (sql) => sql.replace(/\s+/g, " ").trim();

const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await getPool().query(text, params);
    // Opt-in: one page load fires dozens of queries, so this is off by default.
    if (process.env.DB_LOG === "true") {
      console.log(`[db] ${Date.now() - start}ms ${res.rowCount} rows  ${brief(text).slice(0, 100)}`);
    }
    return res;
  } catch (error) {
    // Errors are rare: keep the whole statement, just on one line.
    console.error(`[db] ${error.message}  ${brief(text)}`);
    throw error;
  }
};

module.exports = { getPool, query };
