const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '123456',
    database: 'test_automation_db',
    waitForConnections: true,
    connectionLimit: 10
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