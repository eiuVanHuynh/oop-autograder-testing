-- ============================================================
-- Migration 005: dua du lieu TC-08 ve quy tac docs/test-data-rules.md
-- Chay SAU 002 va 004 (003 chua co tren dev). Chay lai nhieu lan duoc (chi UPDATE).
-- Neu chay lai 002 thi phai chay lai file nay.
--
-- Ten bang/cot theo db/schema/test_automation_db_schema.sql: test_data(data_value), test_cases(tc_code).
-- Neu DB that dung ten cu cua 002 (Test_Data, cot `value`) thi doi:
--   test_data -> Test_Data, test_cases -> Test_Cases, data_value -> `value`.
--
-- Spec TC-08 ghep: irn   = irn_prefix + runId(6 so)   -> 2099 + 6 so = 10 chu so
--                  name  = full_name_prefix + ' ' + runId
--                  email = email_prefix + runId + email_domain
-- ============================================================
UPDATE test_data td
JOIN test_cases tc ON td.test_id = tc.test_id
SET td.data_value = '2099'
WHERE tc.tc_code = 'TC-08' AND td.field_name = 'irn_prefix';

UPDATE test_data td
JOIN test_cases tc ON td.test_id = tc.test_id
SET td.data_value = 'AUTOTEST Tran Thi B'
WHERE tc.tc_code = 'TC-08' AND td.field_name = 'full_name_prefix';

UPDATE test_data td
JOIN test_cases tc ON td.test_id = tc.test_id
SET td.data_value = 'autotest.'
WHERE tc.tc_code = 'TC-08' AND td.field_name = 'email_prefix';
