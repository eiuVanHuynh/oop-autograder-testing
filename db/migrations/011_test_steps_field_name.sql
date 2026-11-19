-- ============================================================
-- Migration 011: cot test_steps.field_name (Postgres)
-- Chay SAU 010. Chay lai nhieu lan duoc.
--
-- Truoc day ten field cua buoc FILL nam trong expected_result dang "(field username)":
-- mot cot van ban cho NGUOI DOC bi dung lam du lieu cho MAY. Cot nay tach hai viec do ra.
-- Chu "(field ...)" trong expected_result VAN GIU NGUYEN: bo runner cu / frontend cu con doc
-- no lam duong lui (xem backend/src/services/runner/steps.js).
-- ============================================================
ALTER TABLE test_steps ADD COLUMN IF NOT EXISTS field_name VARCHAR(100) NULL;

-- Dien cot moi tu chu "(field ...)" da co trong expected_result.
UPDATE test_steps
   SET field_name = substring(expected_result FROM '\(field\s+([A-Za-z0-9_]+)\)')
 WHERE field_name IS NULL
   AND expected_result ~ '\(field\s+[A-Za-z0-9_]+\)';
