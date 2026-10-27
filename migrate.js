const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
require("dotenv").config();

const connectionString =
  "postgresql://postgres.bvtstxpufnukwqvgfwnp:j4Hp4dhhrITFOyMv@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres";

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
];

async function runMigrations() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log("Kết nối thành công tới Supabase PostgreSQL!");

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
      "\nĐã chạy thành công toàn bộ migration và seed data lên Supabase!",
    );
  } catch (err) {
    console.error("\nLỗi trong quá trình chạy migration:", err.message);
    console.error(err);
  } finally {
    await client.end();
  }
}

runMigrations();
