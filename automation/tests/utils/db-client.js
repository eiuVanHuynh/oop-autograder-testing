require('dotenv').config({
    path: require('path').resolve(__dirname, '../../../.env')
});
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'test_automation_db',
    waitForConnections: true,
    // Nho (1-5) de tranh vuot gioi han ket noi cua DB cloud
    connectionLimit: Number(process.env.DB_POOL_SIZE || 5),
    // Cloud thuong bat buoc SSL: dat DB_SSL=true
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
    // Server cloud thuong chay UTC; ep gio Viet Nam khi doc/ghi Date
    timezone: '+07:00',
});

async function query(sql, params = []) {
    const [rows] = await pool.execute(sql, params);
    return rows;
}

async function closeDb() {
    await pool.end();
}

module.exports = {
    query,
    closeDb
};