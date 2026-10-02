-- Cloud: khong dung USE; database duoc chon qua DB_NAME khi ket noi.

-- ============================================================
-- CLEAN EXISTING SEED DATA
-- DELETE on Test_Cases cascades to Test_Steps, Test_Data,
-- Test_Results and Test_Evidences; Bug_Feedbacks.execution_id
-- is set to NULL. FOREIGN_KEY_CHECKS stays ON so cascades work.
-- ============================================================

DELETE FROM Test_Cases;
DELETE FROM Test_Specs;
DELETE FROM Test_Suites;

ALTER TABLE Test_Suites AUTO_INCREMENT = 1;
ALTER TABLE Test_Specs  AUTO_INCREMENT = 1;
ALTER TABLE Test_Cases  AUTO_INCREMENT = 1;
ALTER TABLE Test_Steps  AUTO_INCREMENT = 1;
ALTER TABLE Test_Data   AUTO_INCREMENT = 1;


-- ============================================================
-- 1. TEST SUITES
-- ============================================================

INSERT INTO Test_Suites (suite_name, description)
VALUES
(
    'Authentication Test Suite',
    'Test cases covering the login page, authentication inputs, validation messages, password visibility, remember-me functionality and Google sign-in.'
),
(
    'Login UI Test Suite',
    'Test cases verifying the visual and interactive components of the login page.'
);


-- ============================================================
-- 2. TEST SPECS (one spec per group)
-- ============================================================

INSERT INTO Test_Specs (spec_code, suite_id, source_reference, screen_name, description)
VALUES
(
    'SPEC-01',
    (SELECT suite_id FROM Test_Suites WHERE suite_name = 'Authentication Test Suite'),
    'FR-AUTH-01 to FR-AUTH-10',
    'Login Page',
    'Login page authentication: code input, password input, validation messages, remember-me, Google sign-in and forgot-password link. Google sign-in is verified by iframe presence only, not by the external Google flow.'
),
(
    'SPEC-02',
    (SELECT suite_id FROM Test_Suites WHERE suite_name = 'Login UI Test Suite'),
    'FR-UI-01 to FR-UI-02',
    'Login Page',
    'Visual components of the login page: application title and main heading.'
);


-- ============================================================
-- 3. TEST CASES
-- ============================================================

INSERT INTO Test_Cases
    (spec_id, tc_code, title, preconditions, expected_result, priority, test_type, status)
VALUES
-- SPEC-01 Authentication
(
    (SELECT spec_id FROM Test_Specs WHERE spec_code = 'SPEC-01'),
    'TC-AUTH-001',
    'Login page is displayed',
    'Login page is reachable at https://oop-autograder.vercel.app',
    'The login page loads successfully and displays the required authentication components.',
    'high', 'functional', 'ready'
),
(
    (SELECT spec_id FROM Test_Specs WHERE spec_code = 'SPEC-01'),
    'TC-AUTH-002',
    'Student code input is available',
    'Login page is displayed',
    'The student or lecturer code input is displayed with the placeholder "e.g. 20521234".',
    'high', 'functional', 'ready'
),
(
    (SELECT spec_id FROM Test_Specs WHERE spec_code = 'SPEC-01'),
    'TC-AUTH-003',
    'Valid student code can be entered',
    'Login page is displayed',
    'A valid student code can be entered into the authentication form and the value is kept.',
    'high', 'functional', 'ready'
),
(
    (SELECT spec_id FROM Test_Specs WHERE spec_code = 'SPEC-01'),
    'TC-AUTH-004',
    'Password input is available',
    'Login page is displayed',
    'The password input is displayed with the placeholder "Enter your password".',
    'high', 'functional', 'ready'
),
(
    (SELECT spec_id FROM Test_Specs WHERE spec_code = 'SPEC-01'),
    'TC-AUTH-005',
    'Invalid password displays error',
    'Login page is displayed',
    'An incorrect password produces the error message "IRN or password is wrong".',
    'high', 'validation', 'ready'
),
(
    (SELECT spec_id FROM Test_Specs WHERE spec_code = 'SPEC-01'),
    'TC-AUTH-006',
    'Empty credentials are rejected',
    'Login page is displayed',
    'The login form does not allow submission with empty required credentials.',
    'high', 'validation', 'ready'
),
(
    (SELECT spec_id FROM Test_Specs WHERE spec_code = 'SPEC-01'),
    'TC-AUTH-007',
    'Remember me checkbox is available',
    'Login page is displayed',
    'The Remember Me checkbox is displayed on the login page.',
    'medium', 'functional', 'ready'
),
(
    (SELECT spec_id FROM Test_Specs WHERE spec_code = 'SPEC-01'),
    'TC-AUTH-008',
    'Google sign-in component is available',
    'Login page is displayed',
    'The Google sign-in component (iframe) is present on the login page.',
    'medium', 'functional', 'ready'
),
(
    (SELECT spec_id FROM Test_Specs WHERE spec_code = 'SPEC-01'),
    'TC-AUTH-009',
    'Forgot password link is available',
    'Login page is displayed',
    'The Forgot Password link is displayed and accessible.',
    'medium', 'functional', 'ready'
),
(
    (SELECT spec_id FROM Test_Specs WHERE spec_code = 'SPEC-01'),
    'TC-AUTH-010',
    'Password field accepts input',
    'Login page is displayed',
    'The password field accepts user input and behaves as a password field.',
    'medium', 'functional', 'ready'
),
-- SPEC-02 Login UI
(
    (SELECT spec_id FROM Test_Specs WHERE spec_code = 'SPEC-02'),
    'TC-UI-001',
    'Login page title is correct',
    'Login page is reachable at https://oop-autograder.vercel.app',
    'The application title is "EIU Capstone".',
    'medium', 'ui', 'ready'
),
(
    (SELECT spec_id FROM Test_Specs WHERE spec_code = 'SPEC-02'),
    'TC-UI-002',
    'Login page heading is correct',
    'Login page is reachable at https://oop-autograder.vercel.app',
    'The login page contains the "Lab Management System" heading.',
    'medium', 'ui', 'ready'
);


-- ============================================================
-- 4. TEST STEPS
-- Test_Steps has no "value" column, so the value is written
-- into the action text (e.g. "FILL with value '20521234'").
-- A temp table lets us use tc_code instead of numeric test_id.
-- ============================================================

DROP TEMPORARY TABLE IF EXISTS tmp_steps;
CREATE TEMPORARY TABLE tmp_steps (
    tc_code         VARCHAR(30)  NOT NULL,
    step_order      INT UNSIGNED NOT NULL,
    action          TEXT         NOT NULL,
    target          VARCHAR(255) NULL,
    expected_result TEXT         NULL
);

INSERT INTO tmp_steps (tc_code, step_order, action, target, expected_result)
VALUES
-- TC-AUTH-001
('TC-AUTH-001', 1, 'NAVIGATE', 'https://oop-autograder.vercel.app', 'Login page is loaded successfully.'),
('TC-AUTH-001', 2, 'VERIFY page title equals ''EIU Capstone''', 'page.title', 'Browser title is EIU Capstone.'),
('TC-AUTH-001', 3, 'VERIFY', 'text=Lab Management System', 'Lab Management System heading is visible.'),

-- TC-AUTH-002
('TC-AUTH-002', 1, 'NAVIGATE', 'https://oop-autograder.vercel.app', 'Login page is displayed.'),
('TC-AUTH-002', 2, 'VERIFY', 'placeholder=e.g. 20521234', 'Student Code or Lecturer Code input is visible.'),

-- TC-AUTH-003
('TC-AUTH-003', 1, 'NAVIGATE', 'https://oop-autograder.vercel.app', 'Login page is displayed.'),
('TC-AUTH-003', 2, 'FILL with value ''20521234''', 'placeholder=e.g. 20521234', 'Student code is entered successfully.'),
('TC-AUTH-003', 3, 'VERIFY input value equals ''20521234''', 'placeholder=e.g. 20521234', 'Student code input contains the expected value.'),

-- TC-AUTH-004
('TC-AUTH-004', 1, 'NAVIGATE', 'https://oop-autograder.vercel.app', 'Login page is displayed.'),
('TC-AUTH-004', 2, 'VERIFY', 'placeholder=Enter your password', 'Password input is visible.'),

-- TC-AUTH-005
('TC-AUTH-005', 1, 'NAVIGATE', 'https://oop-autograder.vercel.app', 'Login page is displayed.'),
('TC-AUTH-005', 2, 'FILL with value ''20521234''', 'placeholder=e.g. 20521234', 'Student code is entered.'),
('TC-AUTH-005', 3, 'FILL with value ''wrong_password''', 'placeholder=Enter your password', 'Incorrect password is entered.'),
('TC-AUTH-005', 4, 'CLICK', 'Sign In', 'Login request is submitted.'),
('TC-AUTH-005', 5, 'VERIFY', 'text=IRN or password is wrong', 'Invalid credential error message is displayed.'),

-- TC-AUTH-006
('TC-AUTH-006', 1, 'NAVIGATE', 'https://oop-autograder.vercel.app', 'Login page is displayed.'),
('TC-AUTH-006', 2, 'CLICK', 'Sign In', 'Login validation is triggered.'),
('TC-AUTH-006', 3, 'VERIFY', 'login validation', 'Required authentication fields prevent invalid submission.'),

-- TC-AUTH-007
('TC-AUTH-007', 1, 'NAVIGATE', 'https://oop-autograder.vercel.app', 'Login page is displayed.'),
('TC-AUTH-007', 2, 'VERIFY', 'Remember Me', 'Remember Me checkbox is visible.'),

-- TC-AUTH-008
('TC-AUTH-008', 1, 'NAVIGATE', 'https://oop-autograder.vercel.app', 'Login page is displayed.'),
('TC-AUTH-008', 2, 'VERIFY', 'Google sign-in iframe', 'Google sign-in component is present.'),

-- TC-AUTH-009
('TC-AUTH-009', 1, 'NAVIGATE', 'https://oop-autograder.vercel.app', 'Login page is displayed.'),
('TC-AUTH-009', 2, 'VERIFY', 'Forgot password', 'Forgot password link is visible.'),

-- TC-AUTH-010
('TC-AUTH-010', 1, 'NAVIGATE', 'https://oop-autograder.vercel.app', 'Login page is displayed.'),
('TC-AUTH-010', 2, 'FILL with value ''test_password''', 'placeholder=Enter your password', 'Password value is entered successfully.'),
('TC-AUTH-010', 3, 'VERIFY input value equals ''test_password''', 'placeholder=Enter your password', 'Password input accepts the entered value.'),

-- TC-UI-001
('TC-UI-001', 1, 'NAVIGATE', 'https://oop-autograder.vercel.app', 'Application page is loaded.'),
('TC-UI-001', 2, 'VERIFY page title equals ''EIU Capstone''', 'page.title', 'Page title is EIU Capstone.'),

-- TC-UI-002
('TC-UI-002', 1, 'NAVIGATE', 'https://oop-autograder.vercel.app', 'Application page is loaded.'),
('TC-UI-002', 2, 'VERIFY', 'text=Lab Management System', 'Lab Management System heading is visible.');

INSERT INTO Test_Steps (test_id, step_order, action, target, expected_result)
SELECT tc.test_id, s.step_order, s.action, s.target, s.expected_result
FROM tmp_steps s
JOIN Test_Cases tc ON tc.tc_code = s.tc_code
ORDER BY tc.test_id, s.step_order;

DROP TEMPORARY TABLE tmp_steps;


-- ============================================================
-- 5. TEST DATA
-- One row per field: field_name / value / is_valid
-- ============================================================

DROP TEMPORARY TABLE IF EXISTS tmp_data;
CREATE TEMPORARY TABLE tmp_data (
    tc_code    VARCHAR(30)  NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    `value`    TEXT         NULL,
    is_valid   BOOLEAN      NOT NULL
);

INSERT INTO tmp_data (tc_code, field_name, `value`, is_valid)
VALUES
('TC-AUTH-001', 'url',                  'https://oop-autograder.vercel.app', TRUE),
('TC-AUTH-002', 'code_placeholder',     'e.g. 20521234',                     TRUE),
('TC-AUTH-003', 'username',             '20521234',                          TRUE),
('TC-AUTH-004', 'password_placeholder', 'Enter your password',               TRUE),
('TC-AUTH-005', 'username',             '20521234',                          TRUE),
('TC-AUTH-005', 'password',             'wrong_password',                    FALSE),
('TC-AUTH-006', 'username',             '',                                  FALSE),
('TC-AUTH-006', 'password',             '',                                  FALSE),
('TC-AUTH-007', 'rememberMe',           'true',                              TRUE),
('TC-AUTH-008', 'provider',             'Google',                            TRUE),
('TC-AUTH-009', 'action',               'open forgot password',              TRUE),
('TC-AUTH-010', 'password',             'test_password',                     TRUE),
('TC-UI-001',   'url',                  'https://oop-autograder.vercel.app', TRUE),
('TC-UI-002',   'url',                  'https://oop-autograder.vercel.app', TRUE);

INSERT INTO Test_Data (test_id, field_name, `value`, is_valid)
SELECT tc.test_id, d.field_name, d.`value`, d.is_valid
FROM tmp_data d
JOIN Test_Cases tc ON tc.tc_code = d.tc_code
ORDER BY tc.test_id;

DROP TEMPORARY TABLE tmp_data;


-- ============================================================
-- 6. VERIFICATION
-- Expected: Suites 2, Specs 2, Cases 12, Steps 31, Data 14
-- ============================================================

SELECT 'Test_Suites' AS table_name, COUNT(*) AS total FROM Test_Suites
UNION ALL SELECT 'Test_Specs', COUNT(*) FROM Test_Specs
UNION ALL SELECT 'Test_Cases', COUNT(*) FROM Test_Cases
UNION ALL SELECT 'Test_Steps', COUNT(*) FROM Test_Steps
UNION ALL SELECT 'Test_Data',  COUNT(*) FROM Test_Data;

SELECT
    tc.test_id,
    tc.tc_code,
    su.suite_name,
    sp.spec_code,
    tc.title,
    tc.test_type,
    tc.priority
FROM Test_Cases tc
JOIN Test_Specs  sp ON tc.spec_id  = sp.spec_id
JOIN Test_Suites su ON sp.suite_id = su.suite_id
ORDER BY tc.test_id;