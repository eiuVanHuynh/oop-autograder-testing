-- ============================================================
-- Migration 001: nap 31 test case TC-01..TC-31 (theo bang SRS)
-- Chay SAU seed.sql (seed.sql co DELETE FROM Test_Cases nen se
-- xoa du lieu nay neu chay lai seed.sql).
-- Chay lai nhieu lan duoc: chi them suite/spec/case chua ton tai.
-- Chi nap Test_Cases. Steps/Test_Data se bo sung theo tung lo
-- sau khi chay thu tren he thong that.
-- Khong dung USE; database duoc chon qua DB_NAME khi ket noi.
-- ============================================================

-- 1. SUITES
INSERT INTO Test_Suites (suite_name, description)
SELECT 'SRS - Authentication and User Management',
       'TC-01..TC-12 from the SRS test case table: login, Google OAuth, password recovery, lecturer user management.'
WHERE NOT EXISTS (SELECT 1 FROM Test_Suites WHERE suite_name = 'SRS - Authentication and User Management');

INSERT INTO Test_Suites (suite_name, description)
SELECT 'SRS - Student Submission and Grading',
       'TC-13..TC-22 from the SRS test case table: lab selection, folder submission, 3-pillar grading, feedback, history.'
WHERE NOT EXISTS (SELECT 1 FROM Test_Suites WHERE suite_name = 'SRS - Student Submission and Grading');

INSERT INTO Test_Suites (suite_name, description)
SELECT 'SRS - Lecturer Management',
       'TC-23..TC-31 from the SRS test case table: lab/rubric configuration, dry-run, dashboards, export, role-based access.'
WHERE NOT EXISTS (SELECT 1 FROM Test_Suites WHERE suite_name = 'SRS - Lecturer Management');

-- 2. SPECS
INSERT INTO Test_Specs (spec_code, suite_id, source_reference, screen_name, description)
SELECT 'SPEC-03',
       (SELECT suite_id FROM Test_Suites WHERE suite_name = 'SRS - Authentication and User Management'),
       'SRS 3.2.1, 3.4.2.1, 3.4.2.2, 3.4.2.5, 4.2.1, 4.2.13',
       'Login and User Management',
       'Authentication flows and lecturer user management.'
WHERE NOT EXISTS (SELECT 1 FROM Test_Specs WHERE spec_code = 'SPEC-03');

INSERT INTO Test_Specs (spec_code, suite_id, source_reference, screen_name, description)
SELECT 'SPEC-04',
       (SELECT suite_id FROM Test_Suites WHERE suite_name = 'SRS - Student Submission and Grading'),
       'SRS 3.2.2, 3.2.4, 3.4.2.3, 3.6, 3.7, 4.2.2, 4.2.6',
       'Student Dashboard and Submission',
       'Lab selection, folder submission, grading pillars, feedback and submission history.'
WHERE NOT EXISTS (SELECT 1 FROM Test_Specs WHERE spec_code = 'SPEC-04');

INSERT INTO Test_Specs (spec_code, suite_id, source_reference, screen_name, description)
SELECT 'SPEC-05',
       (SELECT suite_id FROM Test_Suites WHERE suite_name = 'SRS - Lecturer Management'),
       'SRS 3.2.3, 3.4.2.4, 4.2.7-4.2.12',
       'Lecturer Dashboard',
       'Lab and rubric configuration, dry-run, grading dashboard, grade matrix, export, access control.'
WHERE NOT EXISTS (SELECT 1 FROM Test_Specs WHERE spec_code = 'SPEC-05');

-- 3. TEST CASES
DROP TEMPORARY TABLE IF EXISTS tmp_tc;
CREATE TEMPORARY TABLE tmp_tc (
    tc_code         VARCHAR(30)  NOT NULL,
    spec_code       VARCHAR(30)  NOT NULL,
    title           VARCHAR(255) NOT NULL,
    preconditions   TEXT         NULL,
    expected_result TEXT         NULL,
    priority        VARCHAR(20)  NOT NULL,
    test_type       VARCHAR(30)  NOT NULL
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

INSERT INTO Test_Cases
    (spec_id, tc_code, title, preconditions, expected_result, priority, test_type, status)
SELECT sp.spec_id, t.tc_code, t.title, t.preconditions, t.expected_result, t.priority, t.test_type, 'ready'
FROM tmp_tc t
JOIN Test_Specs sp ON sp.spec_code = t.spec_code
WHERE NOT EXISTS (SELECT 1 FROM Test_Cases c WHERE c.tc_code = t.tc_code);

DROP TEMPORARY TABLE tmp_tc;

-- 4. VERIFICATION
-- Neu da chay seed.sql: Suites 5, Specs 5, Cases 43 (12 + 31).
SELECT 'Test_Suites' AS table_name, COUNT(*) AS total FROM Test_Suites
UNION ALL SELECT 'Test_Specs', COUNT(*) FROM Test_Specs
UNION ALL SELECT 'Test_Cases', COUNT(*) FROM Test_Cases;

SELECT tc_code, title FROM Test_Cases
WHERE tc_code IN ('TC-01','TC-02','TC-13','TC-14','TC-15','TC-AUTH-005')
ORDER BY tc_code;