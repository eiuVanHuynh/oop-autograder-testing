-- ============================================================
-- Database verification
-- Database is selected through DB_NAME in the connection.
-- Do not use CREATE DATABASE / USE here.
-- ============================================================


-- 1. Kiểm tra 13 Test Case (TC-01..TC-12, TC-31) đã có ít nhất 1 Step (kỳ vọng: 0 dòng)
SELECT
    tc.tc_code,
    COUNT(ts.step_id) AS step_count
FROM Test_Cases tc
LEFT JOIN Test_Steps ts
    ON ts.test_id = tc.test_id
WHERE tc.tc_code IN ('TC-01','TC-02','TC-03','TC-04','TC-05','TC-06','TC-07','TC-08','TC-09','TC-10','TC-11','TC-12','TC-31')
GROUP BY tc.test_id, tc.tc_code
HAVING COUNT(ts.step_id) = 0;


-- 2. Kiểm tra 13 Test Case đã có Test Data (kỳ vọng: 0 dòng)
SELECT
    tc.tc_code,
    COUNT(td.data_id) AS data_count
FROM Test_Cases tc
LEFT JOIN Test_Data td
    ON td.test_id = tc.test_id
WHERE tc.tc_code IN ('TC-01','TC-02','TC-03','TC-04','TC-05','TC-06','TC-07','TC-08','TC-09','TC-10','TC-11','TC-12','TC-31')
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

-- 5. Không lưu mật khẩu thật: field có chữ password phải là env:... hoặc dữ liệu giả is_valid = FALSE (kỳ vọng: 0 dòng)
SELECT tc.tc_code, td.field_name, td.`value`
FROM Test_Data td
JOIN Test_Cases tc ON tc.test_id = td.test_id
WHERE tc.tc_code IN ('TC-01','TC-02','TC-03','TC-04','TC-05','TC-06','TC-07','TC-08','TC-09','TC-10','TC-11','TC-12','TC-31')
  AND td.field_name LIKE '%password%'
  AND td.`value` NOT LIKE 'env:%'
  AND td.is_valid = TRUE;


-- 6. action phải là MỘT TỪ IN HOA và target phải dạng type=value (kỳ vọng: 0 dòng)
SELECT tc.tc_code, ts.step_order, ts.action, ts.target
FROM Test_Steps ts
JOIN Test_Cases tc ON tc.test_id = ts.test_id
WHERE tc.tc_code IN ('TC-01','TC-02','TC-03','TC-04','TC-05','TC-06','TC-07','TC-08','TC-09','TC-10','TC-11','TC-12','TC-31')
  AND (NOT REGEXP_LIKE(ts.action, '^[A-Z]+$', 'c')
       OR (ts.target IS NOT NULL AND ts.action <> 'NAVIGATE'
           AND ts.target NOT REGEXP '^(text|placeholder|testid)='));