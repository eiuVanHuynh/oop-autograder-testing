
CREATE DATABASE IF NOT EXISTS test_automation_db; 

USE test_automation_db;

SET FOREIGN_KEY_CHECKS = 0; -- xoa bang du co fk 

-- 1. Bảng Test_Suites
DROP TABLE IF EXISTS Test_Suites;
CREATE TABLE Test_Suites (
    suite_id INT AUTO_INCREMENT PRIMARY KEY,
    suite_name VARCHAR(100) NOT NULL,
    module_group VARCHAR(100) NOT NULL,
    description TEXT
);

-- 2. Bảng Test_Cases (Ánh xạ Interface TestCase)
DROP TABLE IF EXISTS Test_Cases;
CREATE TABLE Test_Cases (
    test_id VARCHAR(100) PRIMARY KEY,       -- testId trong TS (vd: "TC-LOGIN-001")
    suite_id INT NOT NULL,
    module VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    source_reference VARCHAR(100),          -- FR-1, mục 4.2.1
    test_type ENUM('UI_COMPONENT', 'AUTHENTICATION', 'SUBMISSION_STRUCTURE', 'GRADING_ENGINE', 'RUBRIC_EDITOR') NOT NULL,
    priority ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'MEDIUM',
    
    CONSTRAINT FK_Test_Cases_Suites FOREIGN KEY (suite_id) REFERENCES Test_Suites(suite_id) ON DELETE CASCADE
);

-- 3. Bảng Test_Specs (Dùng LONGTEXT chứa JSON UI Specs)
DROP TABLE IF EXISTS Test_Specs;
CREATE TABLE Test_Specs (
    spec_id INT AUTO_INCREMENT PRIMARY KEY,
    test_id VARCHAR(100) NOT NULL,
    spec_name VARCHAR(100) NOT NULL,        -- vd: "Google Sign-in Button", "IRN Input"
    component_type VARCHAR(50) NOT NULL,     -- 'BUTTON', 'INPUT_FIELD', 'DROPZONE', 'TAB', 'TABLE'
    spec_payload LONGTEXT NOT NULL,          -- Chuỗi JSON đại diện cho Object UI Specs
    description TEXT,

    CONSTRAINT FK_Test_Specs_Cases FOREIGN KEY (test_id) REFERENCES Test_Cases(test_id) ON DELETE CASCADE
);

-- 4. Bảng Test_Steps
DROP TABLE IF EXISTS Test_Steps;
CREATE TABLE Test_Steps (
    step_id INT AUTO_INCREMENT PRIMARY KEY,
    test_id VARCHAR(100) NOT NULL,
    step_order INT NOT NULL,
    action VARCHAR(100) NOT NULL,           -- click, fill, dragAndDrop
    target VARCHAR(500),                    -- CSS Selector / XPath
    value VARCHAR(500),                     -- Giá trị điền vào
    expected_result TEXT,
    
    CONSTRAINT FK_Test_Steps_Cases FOREIGN KEY (test_id) REFERENCES Test_Cases(test_id) ON DELETE CASCADE
);

-- 5. Bảng Test_Data (Dùng LONGTEXT chứa JSON Data-Driven)
DROP TABLE IF EXISTS Test_Data;
CREATE TABLE Test_Data (
    data_id INT AUTO_INCREMENT PRIMARY KEY,
    test_id VARCHAR(100) NOT NULL,
    data_name VARCHAR(100) NOT NULL,        -- vd: "Valid Student IRN"
    input_data LONGTEXT NOT NULL,           -- Chứa providedEmail, inputConfigData...
    expected_output LONGTEXT NOT NULL,      -- Chứa expectedAuthStatus, expectedScore...
    
    CONSTRAINT FK_Test_Data_Cases FOREIGN KEY (test_id) REFERENCES Test_Cases(test_id) ON DELETE CASCADE
);

-- 6. Bảng Test_Runs
DROP TABLE IF EXISTS Test_Runs;
CREATE TABLE Test_Runs (
    run_id INT AUTO_INCREMENT PRIMARY KEY,
    run_name VARCHAR(100) NOT NULL,
    environment VARCHAR(50) NOT NULL,        -- Local, Staging
    browser VARCHAR(50) NOT NULL,            -- Chromium, Firefox
    executed_by VARCHAR(100),
    executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 7. Bảng Test_Results (Ánh xạ Interface TestExecutionResult)
DROP TABLE IF EXISTS Test_Results;
CREATE TABLE Test_Results (
    execution_id VARCHAR(100) PRIMARY KEY,  -- executionId trong TS
    run_id INT NOT NULL,
    test_id VARCHAR(100) NOT NULL,
    status ENUM('PASSED', 'FAILED', 'ERROR', 'SKIPPED') NOT NULL,
    actual_output TEXT,
    execution_time_ms INT NOT NULL DEFAULT 0,
    error_message TEXT,
    screenshot_path VARCHAR(500),
    executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT FK_Test_Results_Runs FOREIGN KEY (run_id) REFERENCES Test_Runs(run_id) ON DELETE CASCADE,
    CONSTRAINT FK_Test_Results_Cases FOREIGN KEY (test_id) REFERENCES Test_Cases(test_id) ON DELETE CASCADE
);

-- 8. Bảng Bug_Feedbacks
DROP TABLE IF EXISTS Bug_Feedbacks;
CREATE TABLE Bug_Feedbacks (
    bug_id INT AUTO_INCREMENT PRIMARY KEY,
    execution_id VARCHAR(100) NOT NULL,
    dev_assignee VARCHAR(100),
    bug_title VARCHAR(255) NOT NULL,
    bug_description TEXT,
    status ENUM('OPEN', 'IN_PROGRESS', 'FIXED') NOT NULL DEFAULT 'OPEN',
    root_cause TEXT,
    solution TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    CONSTRAINT FK_Bug_Feedbacks_Execution FOREIGN KEY (execution_id) REFERENCES Test_Results(execution_id) ON DELETE CASCADE
);

SET FOREIGN_KEY_CHECKS = 1;