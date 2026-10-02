const { test, expect } = require('@playwright/test');
const { query, closeDb } = require('../utils/db-client');

test.afterAll(async () => {
    await closeDb();
});

test('Read test cases from MySQL', async () => {
    const rows = await query(`
        SELECT
            tc.test_id,
            tc.title,
            tc.module,
            tc.test_type,
            tc.priority,
            td.data_name,
            td.input_data,
            td.expected_output
        FROM Test_Cases tc
        LEFT JOIN Test_Data td
            ON tc.test_id = td.test_id
        ORDER BY tc.test_id
    `);

    const testCaseIds = new Set(rows.map(row => row.test_id));

    expect(testCaseIds.size).toBeGreaterThan(0);

    console.log(`Read ${testCaseIds.size} test cases from MySQL`);

    for (const row of rows) {
        console.log({
            test_id: row.test_id,
            title: row.title,
            data_name: row.data_name,
            input_data: row.input_data,
            expected_output: row.expected_output
        });
    }
});