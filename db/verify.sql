-- ============================================================
-- Database verification
-- Database is selected through DB_NAME in the connection.
-- Do not use CREATE DATABASE / USE here.
-- ============================================================


-- 1. Kiểm tra các Test Case đã có ít nhất 1 Step
SELECT
    tc.tc_code,
    COUNT(ts.step_id) AS step_count
FROM Test_Cases tc
LEFT JOIN Test_Steps ts
    ON ts.test_id = tc.test_id
GROUP BY tc.test_id, tc.tc_code
HAVING COUNT(ts.step_id) = 0;


-- 2. Kiểm tra các Test Case đã có Test Data
SELECT
    tc.tc_code,
    COUNT(td.data_id) AS data_count
FROM Test_Cases tc
LEFT JOIN Test_Data td
    ON td.test_id = tc.test_id
GROUP BY tc.test_id, tc.tc_code
HAVING COUNT(td.data_id) = 0;


-- 3. Kiểm tra tc_code bị trùng
SELECT
    tc_code,
    COUNT(*) AS duplicate_count
FROM Test_Cases
GROUP BY tc_code
HAVING COUNT(*) > 1;


-- 4. Đếm số record của từng bảng
SELECT 'Users' AS table_name, COUNT(*) AS record_count
FROM Users

UNION ALL

SELECT 'Test_Suites', COUNT(*)
FROM Test_Suites

UNION ALL

SELECT 'Test_Specs', COUNT(*)
FROM Test_Specs

UNION ALL

SELECT 'Test_Cases', COUNT(*)
FROM Test_Cases

UNION ALL

SELECT 'Test_Steps', COUNT(*)
FROM Test_Steps

UNION ALL

SELECT 'Test_Data', COUNT(*)
FROM Test_Data

UNION ALL

SELECT 'Test_Runs', COUNT(*)
FROM Test_Runs

UNION ALL

SELECT 'Test_Results', COUNT(*)
FROM Test_Results

UNION ALL

SELECT 'Test_Evidences', COUNT(*)
FROM Test_Evidences

UNION ALL

SELECT 'Bug_Feedbacks', COUNT(*)
FROM Bug_Feedbacks;