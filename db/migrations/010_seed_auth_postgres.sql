-- ============================================================
-- Migration 010: port 006 (+001/002/005) sang PostgreSQL.
-- Bản MySQL (002/004/005/006) không chạy được trên Supabase: backtick, START TRANSACTION,
-- CREATE TEMPORARY TABLE ... CHARSET, UPDATE ... JOIN. File này thay thế chúng.
-- Chạy lại được: suites/specs/cases chỉ thêm cái chưa có; steps/data của 13 TC bị nạp lại.
--
-- test_status: chỉ TC-01, TC-02, TC-31 là 'ready'. 28 TC còn lại để 'draft' vì bước của chúng
-- cần từ vựng ngoài NAVIGATE/FILL/CLICK/VERIFY (UPLOAD ở TC-09, CLICK không target ở TC-10/11,
-- ghép IRN động ở TC-08, OAuth Google ở TC-03/04/05) hoặc chưa có bước nào (TC-13..TC-30).
-- Chỉ 'ready' mới vào biểu thức --grep, nên 'draft' = bộ chạy không nhìn thấy.
--
-- Sửa so với 006: bước NAVIGATE '/login' đổi thành '/'. SUT không có route /login,
-- trang đăng nhập là '/' (docs/testing/sut-reference.md mục 2). Giữ '/login' thì mọi TC
-- đăng nhập chết ngay từ bước 2 vì không tìm thấy ô nhập.
-- ============================================================
BEGIN;

-- 1. SUITES ---------------------------------------------------------------
INSERT INTO test_suites (suite_name, suite_description)
SELECT 'SRS - Authentication and User Management',
       'TC-01..TC-12 from the SRS test case table: login, Google OAuth, password recovery, lecturer user management.'
WHERE NOT EXISTS (SELECT 1 FROM test_suites WHERE suite_name = 'SRS - Authentication and User Management');

INSERT INTO test_suites (suite_name, suite_description)
SELECT 'SRS - Student Submission and Grading',
       'TC-13..TC-22 from the SRS test case table: lab selection, folder submission, 3-pillar grading, feedback, history.'
WHERE NOT EXISTS (SELECT 1 FROM test_suites WHERE suite_name = 'SRS - Student Submission and Grading');

INSERT INTO test_suites (suite_name, suite_description)
SELECT 'SRS - Lecturer Management',
       'TC-23..TC-31 from the SRS test case table: lab/rubric configuration, dry-run, dashboards, export, role-based access.'
WHERE NOT EXISTS (SELECT 1 FROM test_suites WHERE suite_name = 'SRS - Lecturer Management');

-- 2. SPECS ----------------------------------------------------------------
INSERT INTO test_specs (spec_code, suite_id, source_reference, screen_name, spec_description)
SELECT 'SPEC-03',
       (SELECT suite_id FROM test_suites WHERE suite_name = 'SRS - Authentication and User Management'),
       'SRS 3.2.1, 3.4.2.1, 3.4.2.2, 3.4.2.5, 4.2.1, 4.2.13',
       'Login and User Management',
       'Authentication flows and lecturer user management.'
WHERE NOT EXISTS (SELECT 1 FROM test_specs WHERE spec_code = 'SPEC-03');

INSERT INTO test_specs (spec_code, suite_id, source_reference, screen_name, spec_description)
SELECT 'SPEC-04',
       (SELECT suite_id FROM test_suites WHERE suite_name = 'SRS - Student Submission and Grading'),
       'SRS 3.2.2, 3.2.4, 3.4.2.3, 3.6, 3.7, 4.2.2, 4.2.6',
       'Student Dashboard and Submission',
       'Lab selection, folder submission, grading pillars, feedback and submission history.'
WHERE NOT EXISTS (SELECT 1 FROM test_specs WHERE spec_code = 'SPEC-04');

INSERT INTO test_specs (spec_code, suite_id, source_reference, screen_name, spec_description)
SELECT 'SPEC-05',
       (SELECT suite_id FROM test_suites WHERE suite_name = 'SRS - Lecturer Management'),
       'SRS 3.2.3, 3.4.2.4, 4.2.7-4.2.12',
       'Lecturer Dashboard',
       'Lab and rubric configuration, dry-run, grading dashboard, grade matrix, export, access control.'
WHERE NOT EXISTS (SELECT 1 FROM test_specs WHERE spec_code = 'SPEC-05');

-- 3. TEST CASES -----------------------------------------------------------
CREATE TEMP TABLE tmp_tc (
    tc_code         VARCHAR(30)  NOT NULL,
    spec_code       VARCHAR(30)  NOT NULL,
    title           VARCHAR(255) NOT NULL,
    preconditions   TEXT         NULL,
    expected_result TEXT         NULL,
    priority        VARCHAR(20)  NOT NULL,
    test_type       VARCHAR(30)  NOT NULL
) ON COMMIT DROP;

INSERT INTO tmp_tc (tc_code, spec_code, title, preconditions, expected_result, priority, test_type)
VALUES
('TC-01','SPEC-03','Login with valid IRN and password','A valid account exists; login page is displayed','Password hash is verified, a session is created and the user is redirected to the dashboard for their role.','high','functional'),
('TC-02','SPEC-03','Login fails with wrong credentials','Login page is displayed','Authentication is rejected, an error message is shown and the user stays on the login page.','high','validation'),
('TC-03','SPEC-03','Google OAuth login with @eiu.edu.vn account','A Google account in the eiu.edu.vn domain is available','OAuth succeeds and the user is redirected to the dashboard for their role.','high','functional'),
('TC-04','SPEC-03','Google OAuth rejects non-EIU domain','A Google account outside the school domain (e.g. @gmail.com) is available','Access is blocked and a message requires the @eiu.edu.vn domain.','high','validation'),
('TC-05','SPEC-03','First-time Google account setup','A new user signs in with Google for the first time','The Google account is linked, a profile is created and the user is redirected to the dashboard.','medium','functional'),
('TC-06','SPEC-03','Request password recovery by email','A registered school email exists','A reset token is created, an email is sent and a confirmation message is shown in the UI.','medium','functional'),
('TC-07','SPEC-03','Reset password via emailed link','A valid reset link has been received','The password is updated and the user is redirected to the login page.','medium','functional'),
('TC-08','SPEC-03','Lecturer adds a single user','Logged in as lecturer; user management page is open','The account is created and appears in the user management list.','high','functional'),
('TC-09','SPEC-03','Lecturer bulk-adds users by CSV','Logged in as lecturer; CSV file with IRN and email prepared','Valid accounts are imported in bulk and page statistics are updated.','medium','functional'),
('TC-10','SPEC-03','Lecturer updates user information','Logged in as lecturer; an existing user','Name, birth date or role is updated successfully through the UI.','medium','functional'),
('TC-11','SPEC-03','Lecturer resets a user password directly','Logged in as lecturer; an existing user','The password of the selected account is updated from the user management page.','medium','functional'),
('TC-12','SPEC-03','Deactivate account (soft delete)','Logged in as lecturer; an active user','The account becomes inactive instead of being permanently deleted.','medium','functional'),
('TC-13','SPEC-04','Select a lab from the dashboard','Logged in as student','The user is taken to the submission area, which shows submission count and best score.','high','functional'),
('TC-14','SPEC-04','Submit correctly named folder via dropzone','Logged in as student; folder <IRN>_<Name>_lab_N/challenge_N with .java and .mmd files','Relative paths are parsed, code is compiled, graded and the total score is displayed.','high','functional'),
('TC-15','SPEC-04','Handle wrongly named folder','Logged in as student; folder or subfolder with wrong naming','Challenges with non-matching names score 0 while remaining valid files are still graded.','high','validation'),
('TC-16','SPEC-04','Grading pillar 1: MMD diagram','Logged in as student; .mmd with partly wrong class relationships','Wrong parts of the diagram score 0 and correct parts are scored per rubric.','medium','functional'),
('TC-17','SPEC-04','Grading pillar 2: declaration test','Logged in as student; .java partly matching declarations (e.g. wrong access modifier)','Declarations are compared via Reflection and partial credit is given.','medium','functional'),
('TC-18','SPEC-04','Grading pillar 3: operational testcases','Logged in as student; compiled code','Code is executed via Reflection against dynamic assertions and pass/fail is returned.','medium','functional'),
('TC-19','SPEC-04','Lab score when a rubric pillar is missing','Challenge configured without the MMD pillar','The missing pillar is skipped and the score is computed from the remaining pillars.','medium','functional'),
('TC-20','SPEC-04','Challenge missing from submission','Submission lacks a challenge subfolder (e.g. challenge_2)','The missing challenge scores 0 and the lab total reflects the weights of all challenges.','medium','functional'),
('TC-21','SPEC-04','View feedback per pillar','Grading has completed','Specific errors and the score breakdown per pillar are shown on the UI.','medium','functional'),
('TC-22','SPEC-04','View submission history','Logged in as student with past submissions','Submissions are listed by time with submit time and per-challenge scores.','medium','functional'),
('TC-23','SPEC-05','Create and delete lab structure in rubric','Logged in as lecturer; sidebar visible','A lab node is added to or removed from the tree and the main UI is updated.','medium','functional'),
('TC-24','SPEC-05','Define class structure and members','Logged in as lecturer; a class is selected','Class declaration rules are saved and updated in the ClassDetailPanel.','medium','functional'),
('TC-25','SPEC-05','Define UML MMD relationships','Logged in as lecturer; MMD Relations tab open','The relationship rule is saved for evaluating .mmd diagrams.','medium','functional'),
('TC-26','SPEC-05','Configure operational testcases and visibility','Logged in as lecturer; Operational Testcases tab open','The testcase is saved; Example shows full I/O and Hidden shows only pass/fail.','medium','functional'),
('TC-27','SPEC-05','Dry-run testcases with reference source','Logged in as lecturer; reference Java source available','Operational testcases run against the reference code and a success/failure result is returned.','medium','functional'),
('TC-28','SPEC-05','Live grading dashboard','Logged in as lecturer; a lab with student submissions','Total submissions, average score and distribution chart are shown and refresh in real time.','medium','functional'),
('TC-29','SPEC-05','Grade matrix and student history','Logged in as lecturer; grade matrix open','The selected student row is highlighted and the submission history detail opens.','medium','functional'),
('TC-30','SPEC-05','Export grade matrix and lists','Logged in as lecturer; grade matrix open','A report file is generated and downloaded in the chosen format (Excel, PDF, SVG).','medium','functional'),
('TC-31','SPEC-05','Role-based access control','Logged in as student','Access to lecturer-only routes is blocked with 403 Forbidden.','high','validation');

INSERT INTO test_cases
    (spec_id, tc_code, title, preconditions, expected_result, priority, test_type, test_status)
SELECT sp.spec_id, t.tc_code, t.title, t.preconditions, t.expected_result, t.priority, t.test_type,
       CASE WHEN t.tc_code IN ('TC-01', 'TC-02', 'TC-31') THEN 'ready' ELSE 'draft' END
FROM tmp_tc t
JOIN test_specs sp ON sp.spec_code = t.spec_code
WHERE NOT EXISTS (SELECT 1 FROM test_cases c WHERE c.tc_code = t.tc_code);

-- 4. STEPS + DATA của 13 TC ----------------------------------------------
-- Nạp lại từ đầu: xóa trước để chạy lại file này không nhân đôi bước.
DELETE FROM test_steps WHERE test_id IN (
  SELECT test_id FROM test_cases
   WHERE tc_code IN ('TC-01','TC-02','TC-03','TC-04','TC-05','TC-06',
                     'TC-07','TC-08','TC-09','TC-10','TC-11','TC-12','TC-31'));
DELETE FROM test_data WHERE test_id IN (
  SELECT test_id FROM test_cases
   WHERE tc_code IN ('TC-01','TC-02','TC-03','TC-04','TC-05','TC-06',
                     'TC-07','TC-08','TC-09','TC-10','TC-11','TC-12','TC-31'));

CREATE TEMP TABLE tmp_steps (
    tc_code         VARCHAR(30) NOT NULL,
    step_order      INTEGER     NOT NULL,
    action          VARCHAR(30) NOT NULL,
    target          VARCHAR(255) NULL,
    expected_result TEXT        NULL
) ON COMMIT DROP;

CREATE TEMP TABLE tmp_data (
    tc_code    VARCHAR(30)  NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    "value"    TEXT         NULL,
    is_valid   BOOLEAN      NOT NULL
) ON COMMIT DROP;

INSERT INTO tmp_steps (tc_code, step_order, action, target, expected_result)
VALUES
-- TC-01
('TC-01', 1, 'NAVIGATE', '/', 'Login page is displayed.'),
('TC-01', 2, 'FILL', 'placeholder=e.g. 20521234', 'IRN is entered (field username).'),
('TC-01', 3, 'FILL', 'placeholder=Enter your password', 'Password is entered (field password).'),
('TC-01', 4, 'CLICK', 'text=Sign In', 'Login request is submitted.'),
('TC-01', 5, 'VERIFY', NULL, 'Redirected to /student-history (student not in any class) or /student-dashboard (student in a class).'),
-- TC-02
('TC-02', 1, 'NAVIGATE', '/', 'Login page is displayed.'),
('TC-02', 2, 'FILL', 'placeholder=e.g. 20521234', 'IRN is entered (field username).'),
('TC-02', 3, 'FILL', 'placeholder=Enter your password', 'Password is entered (field password).'),
('TC-02', 4, 'CLICK', 'text=Sign In', 'Login request is submitted.'),
('TC-02', 5, 'VERIFY', 'text=IRN or password is wrong', 'Error message is shown and the user stays on the login page.'),
-- TC-03
('TC-03', 1, 'NAVIGATE', '/', 'Login page is displayed.'),
('TC-03', 2, 'CLICK', 'text=Sign in with Google', 'Google sign-in is started.'),
('TC-03', 3, 'VERIFY', NULL, '[BLOCKED: no Google test account/hook] Redirected to /student-history.'),
-- TC-04
('TC-04', 1, 'NAVIGATE', '/', 'Login page is displayed.'),
('TC-04', 2, 'CLICK', 'text=Sign in with Google', 'Google sign-in is started with a non-EIU account.'),
('TC-04', 3, 'VERIFY', NULL, '[BLOCKED: no Google test account/hook] Access is rejected with a domain message.'),
-- TC-05
('TC-05', 1, 'NAVIGATE', '/setup-account', 'Account setup page is displayed.'),
('TC-05', 2, 'FILL', 'placeholder=New password', 'New password is entered (field new_password).'),
('TC-05', 3, 'VERIFY', NULL, '[BLOCKED: no Google test account/hook] Account is set up and user is redirected to the dashboard.'),
-- TC-06
('TC-06', 1, 'NAVIGATE', '/', 'Login page is displayed.'),
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
('TC-08', 1, 'NAVIGATE', '/', 'Login page is displayed.'),
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
('TC-09', 1, 'NAVIGATE', '/', 'Login page is displayed.'),
('TC-09', 2, 'FILL', 'placeholder=e.g. 20521234', 'IRN is entered (field lecturer_username).'),
('TC-09', 3, 'FILL', 'placeholder=Enter your password', 'Password is entered (field lecturer_password).'),
('TC-09', 4, 'CLICK', 'text=Sign In', 'Login request is submitted.'),
('TC-09', 5, 'NAVIGATE', '/lecturer-users', 'User management page is displayed.'),
('TC-09', 6, 'UPLOAD', NULL, 'CSV file (field csv_file) is selected.'),
('TC-09', 7, 'VERIFY', NULL, '[BLOCKED: bulk user creation by CSV is not implemented] Valid accounts are imported and statistics are updated.'),
-- TC-10
('TC-10', 1, 'NAVIGATE', '/', 'Login page is displayed.'),
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
('TC-11', 1, 'NAVIGATE', '/',
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
('TC-12', 1, 'NAVIGATE', '/', 'Login page is displayed.'),
('TC-12', 2, 'FILL', 'placeholder=e.g. 20521234', 'IRN is entered (field lecturer_username).'),
('TC-12', 3, 'FILL', 'placeholder=Enter your password', 'Password is entered (field lecturer_password).'),
('TC-12', 4, 'CLICK', 'text=Sign In', 'Login request is submitted.'),
('TC-12', 5, 'NAVIGATE', '/lecturer-users', 'User management page is displayed.'),
('TC-12', 6, 'CLICK', 'text=Suspend student', 'User suspension action is opened.'),
('TC-12', 7, 'CLICK', 'text=Suspend', 'User suspension is confirmed.'),
('TC-12', 8, 'VERIFY', NULL, 'The user row shows status Suspended and the user is not removed.'),
-- TC-31
('TC-31', 1, 'NAVIGATE', '/', 'Login page is displayed.'),
('TC-31', 2, 'FILL', 'placeholder=e.g. 20521234', 'IRN is entered (field username).'),
('TC-31', 3, 'FILL', 'placeholder=Enter your password', 'Password is entered (field password).'),
('TC-31', 4, 'CLICK', 'text=Sign In', 'Login request is submitted.'),
('TC-31', 5, 'NAVIGATE', '/lecturer-users', 'Student requests a lecturer-only route.'),
('TC-31', 6, 'VERIFY', NULL, 'Access is blocked: URL is no longer /lecturer-users.');

INSERT INTO tmp_data (tc_code, field_name, "value", is_valid)
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

INSERT INTO test_steps (test_id, step_order, step_action, step_target, expected_result)
SELECT tc.test_id, s.step_order, s.action, s.target, s.expected_result
FROM tmp_steps s
JOIN test_cases tc ON tc.tc_code = s.tc_code
ORDER BY tc.test_id, s.step_order;

INSERT INTO test_data (test_id, field_name, data_value, is_valid)
SELECT tc.test_id, d.field_name, d."value", d.is_valid
FROM tmp_data d
JOIN test_cases tc ON tc.tc_code = d.tc_code;

-- 5. Quy tắc dữ liệu TC-08 (thay cho migration 005, vốn dùng UPDATE ... JOIN của MySQL) --
UPDATE test_data td SET data_value = v.val
FROM (VALUES ('irn_prefix', '2099'),
             ('full_name_prefix', 'AUTOTEST Tran Thi B'),
             ('email_prefix', 'autotest.')) AS v(field, val)
WHERE td.field_name = v.field
  AND td.test_id = (SELECT test_id FROM test_cases WHERE tc_code = 'TC-08');

-- 6. Dọn giàn giáo + template để bấm Run --------------------------------
-- TC-DEMO-* là giàn giáo thử module trước khi có Playwright, không phải test chính thức.
-- Để 'ready' thì chúng vào --grep rồi rơi vào case mock → báo 'passed' giả.
UPDATE test_cases SET test_status = 'draft' WHERE tc_code LIKE 'TC-DEMO-%';

INSERT INTO test_templates (template_name, description, scope, target_json, env, timeout, created_by)
SELECT 'SRS Auth - Smoke', 'Ba TC chay duoc bang tu vung co ban: dang nhap dung, dang nhap sai, phan quyen', 'UI',
       '{"testIds": ["TC-01", "TC-02", "TC-31"]}'::jsonb,
       'development', 30000,
       (SELECT user_id FROM users ORDER BY user_id LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM test_templates WHERE template_name = 'SRS Auth - Smoke');

COMMIT;
