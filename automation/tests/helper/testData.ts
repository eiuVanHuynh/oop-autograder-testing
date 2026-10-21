import 'dotenv/config';
import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;

function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT ?? 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      connectionLimit: 3,
      // ssl: { rejectUnauthorized: true }, // bật nếu nhà cung cấp cloud yêu cầu SSL
    });
  }
  return pool;
}

/** Lấy TẤT CẢ giá trị của 1 field (dùng cho field lặp, vd export_format của TC-30). */
export async function getTestDataAll(tcCode: string, field: string): Promise<string[]> {
  const [rows] = await getPool().query<mysql.RowDataPacket[]>(
    `SELECT d.data_value
       FROM test_data d
       JOIN test_cases c ON c.test_id = d.test_id
      WHERE c.tc_code = ? AND d.field_name = ?
      ORDER BY d.data_id`,
    [tcCode, field],
  );
  return rows.map((r) => String(r.data_value ?? ''));
}

/** Lấy 1 giá trị (dòng đầu tiên). Báo lỗi rõ ràng nếu thiếu data. */
export async function getTestData(tcCode: string, field: string): Promise<string> {
  const values = await getTestDataAll(tcCode, field);
  if (values.length === 0) {
    throw new Error(`Thiếu test data: tc_code=${tcCode}, field_name=${field}`);
  }
  return values[0];
}

/** Với field dạng "a;b;c" -> mảng ['a','b','c']. */
export async function getTestDataList(tcCode: string, field: string): Promise<string[]> {
  return (await getTestData(tcCode, field)).split(';').map((s) => s.trim()).filter(Boolean);
}

export async function closeTestDataPool(): Promise<void> {
  if (pool) { await pool.end(); pool = null; }
}