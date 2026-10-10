const { test, expect } = require('@playwright/test');
const { query, closeDb } = require('../utils/db-client');

test.afterAll(async () => {
    await closeDb();
});

test('Read test cases from MySQL', async () => {
    const rows = await query(`
        SELECT
            tc.test_id,
            tc.tc_code,
            tc.title,
            sp.spec_code,
            tc.test_type,
            tc.priority,
            td.field_name,
            td.\`value\`,
            td.is_valid
        FROM Test_Cases tc
        JOIN Test_Specs sp
            ON tc.spec_id = sp.spec_id
        LEFT JOIN Test_Data td
            ON tc.test_id = td.test_id
        ORDER BY tc.test_id, td.data_id
    `);

    const testCaseIds = new Set(rows.map(row => row.test_id));

    expect(testCaseIds.size).toBeGreaterThan(0);

    console.log(`Read ${testCaseIds.size} test cases from MySQL`);

    for (const row of rows) {
        console.log({
            tc_code: row.tc_code,
            title: row.title,
            spec_code: row.spec_code,
            field_name: row.field_name,
            value: row.value,
            is_valid: row.is_valid
        });
    }
});