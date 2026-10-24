const { Pool } = require('pg');

// Singleton: cả tiến trình dùng chung một pool. Vercel serverless tái dùng lại
// Singleton: one pool for the whole process. Vercel serverless reuses a warm
// container nên tạo pool mới mỗi request sẽ cạn kết nối của Supabase.
// container, so a new pool per request would exhaust Supabase's connections.
//
// Cần làm / To do:
// - Khởi tạo Pool từ DATABASE_URL, bật ssl khi chạy trên Vercel.
// - query(): bọc pool.query, log thời gian chạy khi ở chế độ dev.
// - Chỉ repositories/ được require file này. Service không chạm vào đây.
let pool;

const getPool = () => {
  // TODO: tạo pool một lần rồi trả lại
  return pool;
};

const query = async (text, params) => {
  // TODO: return (await getPool().query(text, params)).rows
};

module.exports = { getPool, query };
