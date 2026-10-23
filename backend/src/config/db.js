const mysql = require("mysql2/promise");
require("dotenv").config();

// Singleton: cả tiến trình dùng chung một pool. Vercel serverless tái dùng lại
// container nên tạo pool mới mỗi request sẽ cạn kết nối của MySQL.
// container, so a new pool per request would exhaust MySQL's connections.
//
// Cần làm / To do:
// - Khởi tạo Pool từ DATABASE_URL (hoặc cấu hình MySQL), bật ssl nếu cần.
// - query(): bọc pool.query, log thời gian chạy khi ở chế độ dev.
// - Chỉ repositories/ được require file này. Service không chạm vào đây.
let pool;

const getPool = () => {
  if (!pool) {
    // Hỗ trợ dùng DATABASE_URL dạng mysql://user:pass@host:port/dbname hoặc các biến rời
    pool = mysql.createPool({
      uri:
        process.env.DATABASE_URL ||
        `mysql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST || "localhost"}:${process.env.DB_PORT || 3306}/${process.env.DB_NAME}`,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }
  return pool;
};

const query = async (text, params) => {
  const start = Date.now();
  try {
    // MySQL2 trả về kết quả dạng mảng [rows, fields], ta destructure lấy rows
    const [rows] = await getPool().query(text, params);
    const duration = Date.now() - start;

    // Log thời gian chạy khi ở chế độ dev
    if (process.env.NODE_ENV !== "production") {
      console.log("⚡ [MySQL Query]", {
        text,
        duration: `${duration}ms`,
        rowCount: Array.isArray(rows) ? rows.length : rows.affectedRows,
      });
    }

    return rows;
  } catch (error) {
    console.error("❌ [DB Error]", { text, error: error.message });
    throw error;
  }
};

module.exports = { getPool, query };
