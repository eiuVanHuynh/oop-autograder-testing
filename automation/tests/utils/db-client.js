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
    connectionLimit: 10,
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