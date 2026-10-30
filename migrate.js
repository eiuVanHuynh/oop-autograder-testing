const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
// .env thật nằm ở backend/ (xem db/SETUP-LOCAL.md); giữ cả .env gốc nếu có.
require("dotenv").config({ path: path.join(__dirname, "backend", ".env") });
require("dotenv").config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("Lỗi: Chưa cấu hình DATABASE_URL trong file .env!");
  process.exit(1);
}

// Danh sách các file SQL chuẩn PostgreSQL theo đúng thứ tự thực thi
// 1. Schema chính (tạo bảng, hàm, trigger)
// 2. Seed users
// 3. Migration runs & templates
// 4. Seed sample template
const migrationFiles = [
  "db/schema/test_automation_db_schema.sql",
  "db/migrations/007_seed_users.sql",
  "db/migrations/008_dashboard_runs_templates.sql",
  "db/migrations/009_seed_sample_template.sql",
  // 010 thay cho 001/002/005/006 (bản MySQL, không chạy được trên Postgres).
  "db/migrations/010_seed_auth_postgres.sql",
];

async function runMigrations() {
  const client = new Client({
    connectionString,
    // Postgres local không bật SSL; chỉ DB cloud (Supabase) mới cần.
    ssl: /@(localhost|127\.0\.0\.1)[:/]/.test(connectionString)
      ? false
      : { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log("Kết nối PostgreSQL thành công!");

    for (const relativePath of migrationFiles) {
      const filePath = path.join(__dirname, relativePath);

      if (!fs.existsSync(filePath)) {
        console.warn(`Không tìm thấy file: ${relativePath}, bỏ qua...`);
        continue;
      }

      console.log(`\nĐang chạy file: ${relativePath}`);
      const sqlContent = fs.readFileSync(filePath, "utf8");

      // Thực thi từng file SQL
      await client.query(sqlContent);
      console.log(`Hoàn tất: ${relativePath}`);
    }

    console.log(
      "\nĐã chạy thành công toàn bộ migration và seed data!",
    );
  } catch (err) {
    console.error("\nLỗi trong quá trình chạy migration:", err.message);
    console.error(err);
  } finally {
    await client.end();
  }
}

runMigrations();
