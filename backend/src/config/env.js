require('dotenv').config();

// Đọc biến môi trường một lần. Thiếu biến bắt buộc thì chết ngay lúc khởi động,
// Read env vars once. A missing required var kills the process at startup,
// còn hơn để chạy rồi lỗi 500 giữa chừng.
// which beats booting fine and throwing 500s later.
//
// Cần làm / To do:
// - Bổ sung biến khi dùng tới: GOOGLE_CLIENT_ID, GITHUB_TOKEN, INGEST_API_KEY…
// - Khi deploy Vercel nhớ khai báo đúng những tên này trong Project Settings.
const required = ['DATABASE_URL', 'JWT_SECRET'];

// TODO: kiểm tra `required` có đủ trong process.env, thiếu thì throw.

module.exports = {
  PORT: process.env.PORT || 5000,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  INGEST_API_KEY: process.env.INGEST_API_KEY,
};
