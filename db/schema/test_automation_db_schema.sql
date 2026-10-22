-- Cloud: database da duoc nha cung cap tao san, chon database qua DB_NAME trong ket noi.
-- Khong dung CREATE DATABASE / USE o day.
-- Thay doi cau truc ve sau: viet thanh file trong db/migrations/ (001_..., 002_...).

-- 1. users ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  user_id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name          VARCHAR(100) NOT NULL,
  email              VARCHAR(255) NOT NULL,
  password_hash      VARCHAR(255) NULL,
  auth_provider      ENUM('LOCAL', 'GOOGLE') NOT NULL,
  user_role          ENUM('admin','tester','dev','viewer') NOT NULL,
  user_status        ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- 2. Test_Suites ------------------------------------------------------
CREATE TABLE IF NOT EXISTS test_suites (
  suite_id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  suite_name         VARCHAR(150) NOT NULL,
  suite_description  TEXT NULL,
  created_by         INT UNSIGNED NULL,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by         INT UNSIGNED NULL,
  updated_at         DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (suite_id),
  CONSTRAINT fk_suites_created_by
    FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL,
  CONSTRAINT fk_suites_updated_by
    FOREIGN KEY (updated_by) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- 3. Test_Specs -------------------------------------------------------
CREATE TABLE IF NOT EXISTS test_specs (
  spec_id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  spec_code          VARCHAR(30) NOT NULL,
  suite_id           INT UNSIGNED NOT NULL,
  source_reference   VARCHAR(255) NULL,
  screen_name        VARCHAR(255) NULL,
  spec_description   TEXT NULL,
  created_by         INT UNSIGNED NULL,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by         INT UNSIGNED NULL,
  updated_at         DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (spec_id),
  UNIQUE KEY uq_specs_spec_code (spec_code),
  CONSTRAINT fk_specs_suite
    FOREIGN KEY (suite_id) REFERENCES test_suites(suite_id) ON DELETE RESTRICT,
  CONSTRAINT fk_specs_created_by
    FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL,
  CONSTRAINT fk_specs_updated_by
    FOREIGN KEY (updated_by) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- 4. test_cases -------------------------------------------------------
CREATE TABLE IF NOT EXISTS test_cases (
  test_id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  execution_status ENUM(
    'pending',
    'in_progress',
    'done',
    'reopened'
) NOT NULL DEFAULT 'pending',
  spec_id            INT UNSIGNED NOT NULL,
  tc_code            VARCHAR(30) NOT NULL,
  title              VARCHAR(255) NOT NULL,
  preconditions      TEXT NULL,
  expected_result    TEXT NOT NULL,
  priority           ENUM('low','medium','high','critical') NOT NULL,
  test_type          ENUM('functional','ui','validation','security','performance','usability','audit') NOT NULL,
  test_status        ENUM('draft','ready','deprecated') NOT NULL DEFAULT 'draft',
  automation_ref     VARCHAR(255) NULL,
  created_by         INT UNSIGNED NULL,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by         INT UNSIGNED NULL,
  updated_at         DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (test_id),
  UNIQUE KEY uq_cases_tc_code (tc_code),
  UNIQUE KEY uq_cases_automation_ref (automation_ref),
  CONSTRAINT fk_cases_spec
    FOREIGN KEY (spec_id) REFERENCES test_specs(spec_id) ON DELETE RESTRICT,
  CONSTRAINT fk_cases_created_by
    FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL,
  CONSTRAINT fk_cases_updated_by
    FOREIGN KEY (updated_by) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- 5. Test_Steps -------------------------------------------------------
CREATE TABLE IF NOT EXISTS test_steps (
  step_id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  test_id            INT UNSIGNED NOT NULL,
  step_order         INT UNSIGNED NOT NULL,
  step_action        TEXT NOT NULL,
  step_target        VARCHAR(255) NULL,
  expected_result    TEXT NULL,
  PRIMARY KEY (step_id),
  UNIQUE KEY uq_steps_order (test_id, step_order),
  CONSTRAINT fk_steps_case
    FOREIGN KEY (test_id) REFERENCES test_cases(test_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- 6. Test_Data --------------------------------------------------------
CREATE TABLE IF NOT EXISTS test_data (
  data_id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  test_id            INT UNSIGNED NOT NULL,
  field_name         VARCHAR(100) NOT NULL,
  data_value         TEXT NULL,
  is_valid           BOOLEAN NOT NULL,
  PRIMARY KEY (data_id),
  CONSTRAINT fk_data_case
    FOREIGN KEY (test_id) REFERENCES test_cases(test_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- 7. test_runs --------------------------------------------------------
CREATE TABLE IF NOT EXISTS test_runs (
  run_id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  execution_type ENUM('automation', 'manual') NOT NULL DEFAULT 'automation',    -- cho manual test, fontend để nhập dữ liệu, backend để đưa dữ liệu vào db 
  started_at         DATETIME NOT NULL,
  finished_at        DATETIME NULL,
  browser            VARCHAR(50) NOT NULL,
  environment        VARCHAR(100) NULL,
  git_commit         VARCHAR(64) NULL,
  branch_name        VARCHAR(100) NULL,
  ci_run_id          VARCHAR(100) NULL,

  -- NEW: user thuc hien lan chay test
  tester_id          INT UNSIGNED NULL,

  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (run_id),
  CONSTRAINT fk_test_runs_tester
    FOREIGN KEY (tester_id) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- 8. test_results -----------------------------------------------------
CREATE TABLE IF NOT EXISTS test_results (
  execution_id       INT UNSIGNED NOT NULL AUTO_INCREMENT,
  run_id             INT UNSIGNED NOT NULL,
  test_id            INT UNSIGNED NOT NULL,
  result_status      ENUM('passed','failed','timedOut','skipped','interrupted') NOT NULL,

  -- NEW: ket qua thuc te cua test case
  actual_result      TEXT NULL,

  execution_time_ms  INT UNSIGNED NOT NULL DEFAULT 0,
  error_message      TEXT NULL,
  retry_count        INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (execution_id),
  UNIQUE KEY uq_results_run_execution (run_id, execution_id),
  CONSTRAINT fk_results_run
    FOREIGN KEY (run_id) REFERENCES test_runs(run_id) ON DELETE CASCADE,
  CONSTRAINT fk_results_case
    FOREIGN KEY (test_id) REFERENCES test_cases(test_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- 9. test_evidences ---------------------------------------------------
CREATE TABLE IF NOT EXISTS test_evidences (
  evidence_id        INT UNSIGNED NOT NULL AUTO_INCREMENT,
  result_id          INT UNSIGNED NOT NULL,
  evidence_type      ENUM('screenshot','trace') NOT NULL,
  file_path          VARCHAR(500) NOT NULL,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (evidence_id),
  CONSTRAINT fk_evidences_result
    FOREIGN KEY (result_id) REFERENCES test_results(execution_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- 11. reports ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS reports (
  report_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  run_id INT UNSIGNED NOT NULL,
  execution_id INT UNSIGNED NOT NULL,
  report_type ENUM('pdf') NOT NULL DEFAULT 'pdf',
  file_path VARCHAR(500) NOT NULL,
  generated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  generated_by INT UNSIGNED NULL,

  PRIMARY KEY (report_id),
  UNIQUE KEY uq_reports_execution (execution_id),
  KEY idx_reports_run_execution (run_id, execution_id),

  CONSTRAINT fk_reports_run_execution
    FOREIGN KEY (run_id, execution_id)
    REFERENCES test_results(run_id, execution_id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,

  CONSTRAINT fk_reports_generated_by
    FOREIGN KEY (generated_by)
    REFERENCES users(user_id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- 12. Templates cho frontend
CREATE TABLE IF NOT EXISTS templates (
  template_id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  template_code VARCHAR(20) UNIQUE NOT NULL COMMENT 'Mã hiển thị trên UI, VD: TPL-0941',
  template_name VARCHAR(255) NOT NULL COMMENT 'Tên template, VD: Standard Login Test',
  template_description TEXT COMMENT 'Mô tả chi tiết kịch bản test',
  template_version VARCHAR(50) NOT NULL DEFAULT 'v1.0.0' COMMENT 'Phiên bản hiện tại, backend phụ trách tăng',
  test_scope JSON COMMENT 'Lưu các tag phân loại dưới dạng mảng JSON, VD: ["UI", "Auth"]',
  created_by INT UNSIGNED NULL COMMENT 'ID người tạo (Khóa ngoại trỏ đến bảng users)',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Ngày tạo',
  updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT 'Ngày cập nhật cuối',

  CONSTRAINT fk_templates_created_by
    FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS template_test_cases (
    template_id INT UNSIGNED NOT NULL,
    test_id INT UNSIGNED NOT NULL,
    PRIMARY KEY (template_id, test_id),
    CONSTRAINT fk_ttc_template
        FOREIGN KEY (template_id)
        REFERENCES templates(template_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_ttc_test
        FOREIGN KEY (test_id)
        REFERENCES test_cases(test_id)
        ON DELETE CASCADE
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;