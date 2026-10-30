const fs = require("fs");
const path = require("path");
const { createRequire } = require("module");

// Thư mục gốc KHÔNG có node_modules (toàn bộ dependency nằm ở backend/), nên phải nạp pg và
// dotenv từ đó. Thiếu đoạn này thì trên một máy vừa clone về, `node migrate.js` chết ngay với
// "Cannot find module 'pg'" — chỉ máy nào từng cài gói ở gốc mới chạy được.
const requireDep = createRequire(path.join(__dirname, "backend", "package.json"));
const { Client } = requireDep("pg");
const dotenv = requireDep("dotenv");

// .env thật nằm ở backend/ (xem db/SETUP-LOCAL.md); giữ cả .env gốc nếu có.
dotenv.config({ path: path.join(__dirname, "backend", ".env") });
dotenv.config();

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
  // 011 thêm cột test_steps.field_name rồi điền từ chuỗi "(field …)" của 010.
  "db/migrations/011_test_steps_field_name.sql",
  // 012 thêm cột test_templates.status (FE đã có UI activate/deactivate chờ cột này).
  "db/migrations/012_template_status.sql",
  // 013 tạo bảng bugs (Bug_Feedbacks cũ đã bị xoá khỏi schema).
  "db/migrations/013_bugs.sql",
];

// File SEED: ghi dữ liệu mẫu, và 010 còn DELETE sạch test_steps + test_data của TC-01…TC-12,
// TC-31 rồi nạp lại. Từ khi có PUT /catalog/cases/:id/steps|data, những dòng đó có thể là
// công người dùng tự sửa qua giao diện — chạy lại seed trên DB đang dùng là xoá mất chúng.
// Mốc "DB đang dùng": đã có ít nhất một dòng test_runs (seed không tạo run nào).
// Vẫn muốn nạp lại seed → chạy tay file 010 bằng psql.
const seedFiles = new Set([
  "db/migrations/007_seed_users.sql",
  "db/migrations/009_seed_sample_template.sql",
  "db/migrations/010_seed_auth_postgres.sql",
]);

async function databaseInUse(client) {
  try {
    const res = await client.query("SELECT 1 FROM test_runs LIMIT 1");
    return res.rowCount > 0;
  } catch (err) {
    // CHỈ "bảng chưa tồn tại" (42P01) mới là DB trống. Mọi lỗi khác (mất kết nối, hết quyền,
    // timeout) phải dừng migrate: coi chúng là "DB trống" thì seed 010 chạy và xoá sạch
    // test_steps + test_data của TC-01…TC-12 — đúng thứ chốt này sinh ra để ngăn.
    if (err.code === "42P01") return false;
    throw err;
  }
}

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

    const inUse = await databaseInUse(client);
    if (inUse) {
      console.log(
        "DB đã có test_runs → coi là đang dùng: bỏ qua các file seed để không xoá dữ liệu đã sửa.",
      );
    }

    for (const relativePath of migrationFiles) {
      if (inUse && seedFiles.has(relativePath)) {
        console.log(`\nBỏ qua seed: ${relativePath}`);
        continue;
      }
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
