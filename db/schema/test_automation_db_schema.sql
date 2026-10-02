CREATE DATABASE IF NOT EXISTS test_automation_db

  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE test_automation_db;

-- 1. Users ------------------------------------------------------------
CREATE TABLE Users (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name     VARCHAR(100) NOT NULL,
  email         VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('admin','tester') NOT NULL,
  status        ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;

-- 2. Test_Suites ------------------------------------------------------
CREATE TABLE Test_Suites (
  suite_id    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  suite_name  VARCHAR(150) NOT NULL,
  description TEXT NULL,
  created_by  INT UNSIGNED NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by  INT UNSIGNED NULL,
  updated_at  DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (suite_id),
  CONSTRAINT fk_suites_created_by FOREIGN KEY (created_by) REFERENCES Users(id) ON DELETE SET NULL,
  CONSTRAINT fk_suites_updated_by FOREIGN KEY (updated_by) REFERENCES Users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 3. Test_Specs (yeu cau/man hinh can test, nguon tu bao cao A) -------
CREATE TABLE Test_Specs (
  spec_id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  spec_code        VARCHAR(30) NOT NULL,     -- ma do nhom tu dat, vd: SPEC-01
  suite_id         INT UNSIGNED NOT NULL,
  source_reference VARCHAR(255) NULL,        -- nguon trong bao cao A, vd: FR-12 hoac Section 4.2.13
  screen_name      VARCHAR(150) NULL,        -- ghi chu man hinh lien quan
  description      TEXT NULL,
  created_by       INT UNSIGNED NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by       INT UNSIGNED NULL,
  updated_at       DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (spec_id),
  UNIQUE KEY uq_specs_spec_code (spec_code),
  CONSTRAINT fk_specs_suite      FOREIGN KEY (suite_id)   REFERENCES Test_Suites(suite_id) ON DELETE RESTRICT,
  CONSTRAINT fk_specs_created_by FOREIGN KEY (created_by) REFERENCES Users(id)             ON DELETE SET NULL,
  CONSTRAINT fk_specs_updated_by FOREIGN KEY (updated_by) REFERENCES Users(id)             ON DELETE SET NULL
) ENGINE=InnoDB;

-- 4. Test_Cases (thuoc 1 Spec; Suite suy ra qua Spec) -----------------
CREATE TABLE Test_Cases (
  test_id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  spec_id         INT UNSIGNED NOT NULL,
  tc_code         VARCHAR(30)  NOT NULL,     -- ma de doc, vd: TC-LOGIN-001
  title           VARCHAR(255) NOT NULL,
  preconditions   TEXT NULL,
  expected_result TEXT NOT NULL,
  priority        ENUM('low','medium','high','critical') NOT NULL,
  test_type       ENUM('functional','ui','validation','security','performance','usability','audit') NOT NULL,
  status          ENUM('draft','ready','deprecated') NOT NULL DEFAULT 'draft',
  automation_ref  VARCHAR(255) NULL,         -- ma tham chieu trong code Playwright
  created_by      INT UNSIGNED NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by      INT UNSIGNED NULL,
  updated_at      DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (test_id),
  UNIQUE KEY uq_cases_tc_code (tc_code),
  UNIQUE KEY uq_cases_automation_ref (automation_ref),   -- UNIQUE, cho phep nhieu NULL
  CONSTRAINT fk_cases_spec       FOREIGN KEY (spec_id)    REFERENCES Test_Specs(spec_id) ON DELETE RESTRICT,
  CONSTRAINT fk_cases_created_by FOREIGN KEY (created_by) REFERENCES Users(id)           ON DELETE SET NULL,
  CONSTRAINT fk_cases_updated_by FOREIGN KEY (updated_by) REFERENCES Users(id)           ON DELETE SET NULL
) ENGINE=InnoDB;

-- 5. Test_Steps -------------------------------------------------------
CREATE TABLE Test_Steps (
  step_id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  test_id         INT UNSIGNED NOT NULL,
  step_order      INT UNSIGNED NOT NULL,
  action          TEXT NOT NULL,
  target          VARCHAR(255) NULL,
  expected_result TEXT NULL,
  PRIMARY KEY (step_id),
  CONSTRAINT fk_steps_case FOREIGN KEY (test_id) REFERENCES Test_Cases(test_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 6. Test_Data --------------------------------------------------------
CREATE TABLE Test_Data (
  data_id    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  test_id    INT UNSIGNED NOT NULL,
  field_name VARCHAR(100) NOT NULL,
  `value`    TEXT NULL,
  is_valid   BOOLEAN NOT NULL,
  PRIMARY KEY (data_id),
  CONSTRAINT fk_data_case FOREIGN KEY (test_id) REFERENCES Test_Cases(test_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 7. Test_Runs --------------------------------------------------------
CREATE TABLE Test_Runs (
  run_id      INT UNSIGNED NOT NULL AUTO_INCREMENT,
  started_at  DATETIME NOT NULL,
  finished_at DATETIME NULL,
  browser     VARCHAR(50) NOT NULL,
  environment VARCHAR(100) NULL,
  git_commit  VARCHAR(64) NULL,
  branch_name VARCHAR(100) NULL,
  ci_run_id   VARCHAR(100) NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (run_id)
) ENGINE=InnoDB;

-- 8. Test_Results -----------------------------------------------------
CREATE TABLE Test_Results (
  execution_id      INT UNSIGNED NOT NULL AUTO_INCREMENT,
  run_id            INT UNSIGNED NOT NULL,
  test_id           INT UNSIGNED NOT NULL,
  status            ENUM('passed','failed','timedOut','skipped','interrupted') NOT NULL,
  execution_time_ms INT UNSIGNED NOT NULL DEFAULT 0,
  error_message     TEXT NULL,
  retry_count       INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (execution_id),
  CONSTRAINT fk_results_run  FOREIGN KEY (run_id)  REFERENCES Test_Runs(run_id)   ON DELETE CASCADE,
  CONSTRAINT fk_results_case FOREIGN KEY (test_id) REFERENCES Test_Cases(test_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 9. Test_Evidences ---------------------------------------------------
CREATE TABLE Test_Evidences (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  result_id  INT UNSIGNED NOT NULL,
  type       ENUM('screenshot','video','trace') NOT NULL,
  file_path  VARCHAR(500) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_evidences_result FOREIGN KEY (result_id) REFERENCES Test_Results(execution_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 10. Bug_Feedbacks ---------------------------------------------------
-- Rule "chi bao bug khi test Fail" do back-end kiem tra, DB khong ep duoc.
CREATE TABLE Bug_Feedbacks (
  bug_id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  execution_id    INT UNSIGNED NULL,
  reported_by     INT UNSIGNED NULL,
  bug_title       VARCHAR(255) NOT NULL,
  bug_description TEXT NULL,
  severity        ENUM('low','medium','high','critical') NOT NULL,
  status          ENUM('open','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by      INT UNSIGNED NULL,
  updated_at      DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (bug_id),
  CONSTRAINT fk_bugs_result      FOREIGN KEY (execution_id) REFERENCES Test_Results(execution_id) ON DELETE SET NULL,
  CONSTRAINT fk_bugs_reported_by FOREIGN KEY (reported_by)  REFERENCES Users(id)                  ON DELETE SET NULL,
  CONSTRAINT fk_bugs_updated_by  FOREIGN KEY (updated_by)   REFERENCES Users(id)                  ON DELETE SET NULL
) ENGINE=InnoDB;

