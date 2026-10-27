const { Pool } = require("pg");
require("dotenv").config();

// Singleton: cả tiến trình dùng chung một pool. Vercel serverless tái dùng lại
// container nên tạo pool mới mỗi request sẽ cạn kết nối của PostgreSQL.
// container, so a new pool per request would exhaust PostgreSQL's connections.
//
// Chỉ repositories/ được require file này. Service không chạm vào đây.
// Only repositories/ may require this file. Services never touch it.
let pool;

const getPool = () => {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // Nhỏ (1-5) để tránh vượt giới hạn kết nối của DB cloud,
      // theo đúng ghi chú ở automation/tests/utils/db-client.js
      max: Number(process.env.DB_POOL_SIZE || 5),
      // Supabase bắt buộc SSL; Postgres local thường không bật. Cùng quy ước DB_SSL.
      ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: true } : undefined,
    });
  }
  return pool;
};

// Trả về NGUYÊN result của pg: đọc thì dùng .rows, ghi thì dùng .rowCount.
// Returns pg's result object as-is: read via .rows, write via .rowCount.
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await getPool().query(text, params);

    if (process.env.NODE_ENV !== "production") {
      console.log("⚡ [Postgres Query]", {
        text,
        duration: `${Date.now() - start}ms`,
        rowCount: res.rowCount,
      });
    }

    return res;
  } catch (error) {
    console.error("❌ [DB Error]", { text, error: error.message });
    throw error;
  }
};

module.exports = { getPool, query };
