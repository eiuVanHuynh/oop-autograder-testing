-- ============================================================
-- Migration 002: steps va test data cho TC-01..TC-12 va TC-31
-- Chay SAU 001_srs_test_cases.sql. KHONG chay lai seed.sql.
-- Chay lai nhieu lan duoc: xoa steps/data cu cua dung 13 TC nay
-- roi nap lai (khong dong vao Test_Cases va Test_Results).
-- Quy uoc theo db/README.md: action la 1 tu IN HOA, target dang
-- type=value, field_name snake_case, bi mat dung env:TEN_BIEN.
-- Dong co nhan / TBD: chua chay that tren he thong. [BLOCKED] là hệ thống chạy không như mong muốn
-- Khong dung USE; database duoc chon qua DB_NAME khi ket noi.
-- ============================================================

-- 1. Xoa du lieu cu cua 13 TC
DELETE ts FROM Test_Steps ts
JOIN Test_Cases tc ON tc.test_id = ts.test_id
WHERE tc.tc_code IN ('TC-01','TC-02','TC-03','TC-04','TC-05','TC-06','TC-07','TC-08','TC-09','TC-10','TC-11','TC-12','TC-31');

DELETE td FROM Test_Data td
JOIN Test_Cases tc ON tc.test_id = td.test_id
WHERE tc.tc_code IN ('TC-01','TC-02','TC-03','TC-04','TC-05','TC-06','TC-07','TC-08','TC-09','TC-10','TC-11','TC-12','TC-31');

-- 2. Bang tam (COLLATE ro rang de JOIN khong loi collation tren MySQL 8)
DROP TEMPORARY TABLE IF EXISTS tmp_steps;
CREATE TEMPORARY TABLE tmp_steps (
    tc_code         VARCHAR(30)  NOT NULL,
    step_order      INT UNSIGNED NOT NULL,
    action          TEXT         NOT NULL,
    target          VARCHAR(255) NULL,
    expected_result TEXT         NULL
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TEMPORARY TABLE IF EXISTS tmp_data;
CREATE TEMPORARY TABLE tmp_data (
    tc_code    VARCHAR(30)  NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    `value`    TEXT         NULL,
    is_valid   BOOLEAN      NOT NULL
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. STEPS
INSERT INTO tmp_steps (tc_code, step_order, action, target, expected_result)
VALUES
-- TC-01
('TC-01', 1, 'NAVIGATE', '/login', 'Login page is displayed.'),
('TC-01', 2, 'FILL', 'placeholder=e.g. 20521234', 'IRN is entered (field username).'),
('TC-01', 3, 'FILL', 'placeholder=Enter your password', 'Password is entered (field password).'),
('TC-01', 4, 'CLICK', 'text=Sign In', 'Login request is submitted.'),
('TC-01', 5, 'VERIFY', NULL, 'Redirected to /student-history (student not in any class) or /student-dashboard (student in a class).'),
-- TC-02
('TC-02', 1, 'NAVIGATE', '/login', 'Login page is displayed.'),
('TC-02', 2, 'FILL', 'placeholder=e.g. 20521234', 'IRN is entered (field username).'),
('TC-02', 3, 'FILL', 'placeholder=Enter your password', 'Password is entered (field password).'),
('TC-02', 4, 'CLICK', 'text=Sign In', 'Login request is submitted.'),
('TC-02', 5, 'VERIFY', 'text=IRN or password is wrong', 'Error message is shown and the user stays on the login page.'),
-- TC-03
('TC-03', 1, 'NAVIGATE', '/login', 'Login page is displayed.'),
('TC-03', 2, 'CLICK', 'text=Sign in with Google', 'Google sign-in is started.'),
('TC-03', 3, 'VERIFY', NULL, '[BLOCKED: no Google test account/hook] Redirected to /student-history.'),
-- TC-04
('TC-04', 1, 'NAVIGATE', '/login', 'Login page is displayed.'),
('TC-04', 2, 'CLICK', 'text=Sign in with Google', 'Google sign-in is started with a non-EIU account.'),
('TC-04', 3, 'VERIFY', NULL, '[BLOCKED: no Google test account/hook] Access is rejected with a domain message.'),
-- TC-05
('TC-05', 1, 'NAVIGATE', '/setup-account', 'Account setup page is displayed.'),
('TC-05', 2, 'FILL', 'placeholder=New password', 'New password is entered (field new_password).'),
('TC-05', 3, 'VERIFY', NULL, '[BLOCKED: no Google test account/hook] Account is set up and user is redirected to the dashboard.'),
-- TC-06
('TC-06', 1, 'NAVIGATE', '/login', 'Login page is displayed.'),
('TC-06', 2, 'CLICK', 'text=Forgot password', 'Forgot password form is displayed. [BLOCKED: Forgot Password form does not appear after automated click]'),
('TC-06', 3, 'FILL', 'placeholder=you@eiu.edu.vn', 'Email is entered (field email).'),
('TC-06', 4, 'CLICK', 'text=Send reset link', 'Reset request is submitted.'),
('TC-06', 5, 'VERIFY', 'text=Check your inbox for a reset link', 'Confirmation message is shown.'),
-- TC-07
('TC-07', 1, 'NAVIGATE', '/reset-password', 'Reset page is displayed with the token from field reset_token.'),
('TC-07', 2, 'FILL', 'placeholder=New password', 'New password is entered (field new_password).'),
('TC-07', 3, 'FILL', 'placeholder=Confirm password', 'Password confirmation is entered (field new_password).'),
('TC-07', 4, 'CLICK', 'text=Submit', 'Reset request is submitted.'),
('TC-07', 5, 'VERIFY', NULL, '[SKIPPED when TEST_RESET_TOKEN is missing] User is redirected to the login page (/).'),
-- TC-08
('TC-08', 1, 'NAVIGATE', '/login', 'Login page is displayed.'),
('TC-08', 2, 'FILL', 'placeholder=e.g. 20521234', 'IRN is entered (field lecturer_username).'),
('TC-08', 3, 'FILL', 'placeholder=Enter your password', 'Password is entered (field lecturer_password).'),
('TC-08', 4, 'CLICK', 'text=Sign In', 'Login request is submitted.'),
('TC-08', 5, 'NAVIGATE', '/lecturer-users', 'User management page is displayed.'),
('TC-08', 6, 'CLICK', 'text=Add User', 'Add user form is displayed.'),
('TC-08', 7, 'CLICK', 'text=STUDENT', 'Role STUDENT is selected (checkbox).'),
('TC-08', 8, 'FILL', 'placeholder=e.g. 2052123456', 'IRN is entered (irn_prefix + unique run id).'),
('TC-08', 9, 'FILL', 'placeholder=Enter full name', 'Full name is entered (full_name_prefix + run id).'),
('TC-08', 10, 'FILL', 'placeholder=user@eiu.edu.vn', 'Email is entered (email_prefix + run id + email_domain).'),
('TC-08', 11, 'FILL', 'placeholder=Enter password', 'Password is entered (field user_password).'),
('TC-08', 12, 'CLICK', 'text=Create User', 'User creation is submitted.'),
('TC-08', 13, 'FILL', 'placeholder=Search by IRN, name or email', 'Search by the new IRN.'),
('TC-08', 14, 'VERIFY', NULL, 'The new user appears as a row in the user table.'),
-- TC-09
('TC-09', 1, 'NAVIGATE', '/login', 'Login page is displayed.'),
('TC-09', 2, 'FILL', 'placeholder=e.g. 20521234', 'IRN is entered (field lecturer_username).'),
('TC-09', 3, 'FILL', 'placeholder=Enter your password', 'Password is entered (field lecturer_password).'),
('TC-09', 4, 'CLICK', 'text=Sign In', 'Login request is submitted.'),
('TC-09', 5, 'NAVIGATE', '/lecturer-users', 'User management page is displayed.'),
('TC-09', 6, 'UPLOAD', NULL, 'CSV file (field csv_file) is selected.'),
('TC-09', 7, 'VERIFY', NULL, '[BLOCKED: bulk user creation by CSV is not implemented] Valid accounts are imported and statistics are updated.'),
-- TC-10
('TC-10', 1, 'NAVIGATE', '/login', 'Login page is displayed.'),
('TC-10', 2, 'FILL', 'placeholder=e.g. 20521234', 'IRN is entered (field lecturer_username).'),
('TC-10', 3, 'FILL', 'placeholder=Enter your password', 'Password is entered (field lecturer_password).'),
('TC-10', 4, 'CLICK', 'text=Sign In', 'Login request is submitted.'),
('TC-10', 5, 'NAVIGATE', '/lecturer-users', 'User management page is displayed.'),
('TC-10', 6, 'FILL', 'placeholder=Search by IRN, name or email', 'Search for the user created by TC-08.'),
('TC-10', 7, 'CLICK', NULL,
 'First action button (Edit) in the user row is clicked; Edit User form is opened for the target user.'),
('TC-10', 8, 'FILL', 'placeholder=Enter full name',
 'New name is entered (original name + name_suffix).'),
('TC-10', 9, 'CLICK', 'text=Save Changes',
 'User information update is submitted.'),
('TC-10', 10, 'VERIFY', NULL,
 'After reload, the row shows the updated name.'),
-- TC-11
('TC-11', 1, 'NAVIGATE', '/login',
 'Login page is displayed.'),
('TC-11', 2, 'FILL', 'placeholder=e.g. 20521234',
 'IRN is entered (field lecturer_username).'),
('TC-11', 3, 'FILL', 'placeholder=Enter your password',
 'Password is entered (field lecturer_password).'),
('TC-11', 4, 'CLICK', 'text=Sign In',
 'Login request is submitted.'),
('TC-11', 5, 'NAVIGATE', '/lecturer-users',
 'User management page is displayed.'),
('TC-11', 6, 'CLICK', NULL,
 'First action button (Edit) in the user row is clicked; Edit User form is opened for the target user.'),
('TC-11', 7, 'FILL', 'placeholder=Leave blank to keep current password',
 'New password is entered (field new_password).'),
('TC-11', 8, 'CLICK', 'text=Save Changes',
 'Updated password is submitted.'),
('TC-11', 9, 'VERIFY', 'placeholder=Leave blank to keep current password',
 'Edit User form is closed after saving.'),
 -- TC-12
('TC-12', 1, 'NAVIGATE', '/login', 'Login page is displayed.'),
('TC-12', 2, 'FILL', 'placeholder=e.g. 20521234', 'IRN is entered (field lecturer_username).'),
('TC-12', 3, 'FILL', 'placeholder=Enter your password', 'Password is entered (field lecturer_password).'),
('TC-12', 4, 'CLICK', 'text=Sign In', 'Login request is submitted.'),
('TC-12', 5, 'NAVIGATE', '/lecturer-users', 'User management page is displayed.'),
('TC-12', 6, 'CLICK', 'text=Suspend student', 'User suspension action is opened.'),
('TC-12', 7, 'CLICK', 'text=Suspend', 'User suspension is confirmed.'),
('TC-12', 8, 'VERIFY', NULL, 'The user row shows status Suspended and the user is not removed.'),
-- TC-31
('TC-31', 1, 'NAVIGATE', '/login', 'Login page is displayed.'),
('TC-31', 2, 'FILL', 'placeholder=e.g. 20521234', 'IRN is entered (field username).'),
('TC-31', 3, 'FILL', 'placeholder=Enter your password', 'Password is entered (field password).'),
('TC-31', 4, 'CLICK', 'text=Sign In', 'Login request is submitted.'),
('TC-31', 5, 'NAVIGATE', '/lecturer-users', 'Student requests a lecturer-only route.'),
('TC-31', 6, 'VERIFY', NULL, 'Access is blocked: URL is no longer /lecturer-users.');

-- 4. DATA
INSERT INTO tmp_data (tc_code, field_name, `value`, is_valid)
VALUES
-- TC-01
('TC-01', 'username', 'env:TEST_STUDENT_IRN', TRUE),
('TC-01', 'password', 'env:TEST_STUDENT_PASSWORD', TRUE),
('TC-01', 'expected_url', '/student-(dashboard|history)', TRUE),
-- TC-02
('TC-02', 'username', 'env:TEST_STUDENT_IRN', TRUE),
('TC-02', 'password', 'Wrong_Password_123', FALSE),
('TC-02', 'expected_message', 'IRN or password is wrong', TRUE),
-- TC-03
('TC-03', 'google_email', 'student@eiu.edu.vn', TRUE),
('TC-03', 'expected_url', '/student-history', TRUE),
-- TC-04
('TC-04', 'google_email', 'external@gmail.com', FALSE),
('TC-04', 'expected_message', 'TBD', TRUE),
-- TC-05
('TC-05', 'google_email', 'student@eiu.edu.vn', TRUE),
('TC-05', 'new_password', 'env:TEST_RESET_PASSWORD', TRUE),
-- TC-06
('TC-06', 'email', 'student01@eiu.edu.vn', TRUE),
('TC-06', 'expected_message', 'Check your inbox for a reset link', TRUE),
-- TC-07
('TC-07', 'reset_token', 'env:TEST_RESET_TOKEN', TRUE),
('TC-07', 'new_password', 'env:TEST_RESET_PASSWORD', TRUE),
('TC-07', 'expected_url', '/', TRUE),
-- TC-08
('TC-08', 'lecturer_username', 'env:TEST_LECTURER_IRN', TRUE),
('TC-08', 'lecturer_password', 'env:TEST_LECTURER_PASSWORD', TRUE),
('TC-08', 'role', 'STUDENT', TRUE),
('TC-08', 'irn_prefix', '2024', TRUE),
('TC-08', 'full_name_prefix', 'Tran Thi B', TRUE),
('TC-08', 'email_prefix', 'tranthib', TRUE),
('TC-08', 'email_domain', '@eiu.edu.vn', TRUE),
('TC-08', 'user_password', 'env:TEST_NEW_USER_PASSWORD', TRUE),
-- TC-09
('TC-09', 'lecturer_username', 'env:TEST_LECTURER_IRN', TRUE),
('TC-09', 'lecturer_password', 'env:TEST_LECTURER_PASSWORD', TRUE),
('TC-09', 'csv_file', 'fixtures/student_list_batch1.csv', TRUE),
-- TC-10
('TC-10', 'lecturer_username', 'env:TEST_LECTURER_IRN', TRUE),
('TC-10', 'lecturer_password', 'env:TEST_LECTURER_PASSWORD', TRUE),
('TC-10', 'name_suffix', ' Updated', TRUE),
-- TC-11
('TC-11', 'lecturer_username', 'env:TEST_LECTURER_IRN', TRUE),
('TC-11', 'lecturer_password', 'env:TEST_LECTURER_PASSWORD', TRUE),
('TC-11', 'new_password', 'env:TEST_TEMP_PASSWORD', TRUE),
-- TC-12
('TC-12', 'lecturer_username', 'env:TEST_LECTURER_IRN', TRUE),
('TC-12', 'lecturer_password', 'env:TEST_LECTURER_PASSWORD', TRUE),
('TC-12', 'expected_status', 'Suspended', TRUE),
-- TC-31
('TC-31', 'username', 'env:TEST_STUDENT_IRN', TRUE),
('TC-31', 'password', 'env:TEST_STUDENT_PASSWORD', TRUE),
('TC-31', 'forbidden_route', '/lecturer-users', FALSE),
('TC-31', 'expected_url', '/student-(dashboard|history)', TRUE);

-- 5. Nap vao bang that
INSERT INTO Test_Steps (test_id, step_order, action, target, expected_result)
SELECT tc.test_id, s.step_order, s.action, s.target, s.expected_result
FROM tmp_steps s
JOIN Test_Cases tc ON tc.tc_code = s.tc_code
ORDER BY tc.test_id, s.step_order;

INSERT INTO Test_Data (test_id, field_name, `value`, is_valid)
SELECT tc.test_id, d.field_name, d.`value`, d.is_valid
FROM tmp_data d
JOIN Test_Cases tc ON tc.tc_code = d.tc_code;

DROP TEMPORARY TABLE tmp_steps;
DROP TEMPORARY TABLE tmp_data;

-- 6. Doi chieu so luong
SELECT tc.tc_code, COUNT(DISTINCT ts.step_id) AS steps, COUNT(DISTINCT td.data_id) AS data_rows
FROM Test_Cases tc
LEFT JOIN Test_Steps ts ON ts.test_id = tc.test_id
LEFT JOIN Test_Data td ON td.test_id = tc.test_id
WHERE tc.tc_code IN ('TC-01','TC-02','TC-03','TC-04','TC-05','TC-06','TC-07','TC-08','TC-09','TC-10','TC-11','TC-12','TC-31')
GROUP BY tc.test_id, tc.tc_code
ORDER BY tc.test_id;