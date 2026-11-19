-- ============================================================
-- Migration 012: cot test_templates.status (Postgres)
-- Chay lai nhieu lan duoc. Chi DDL, khong xoa du lieu.
--
-- Frontend da co san UI activate/deactivate nhung dang tat sau co TEMPLATE_STATUS_READY
-- vi DB khong co cot nay (views/Templates.jsx, services/templateService.js).
-- ============================================================
ALTER TABLE test_templates
  ADD COLUMN IF NOT EXISTS status VARCHAR(10) NOT NULL DEFAULT 'active';

ALTER TABLE test_templates DROP CONSTRAINT IF EXISTS chk_templates_status;
ALTER TABLE test_templates
  ADD CONSTRAINT chk_templates_status CHECK (status IN ('active', 'inactive'));
