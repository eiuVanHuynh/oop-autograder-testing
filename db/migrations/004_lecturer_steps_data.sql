-- 004_lecturer_steps_data.sql
-- Steps + Data cho TC-23 ... TC-30 (Sinh vien: MMD/Testcase/History; Giang vien: Dashboard/Matrix/Export).
--
-- !! SAI MA TC (chot ngay 20/10/2026) !!
-- Theo docs/testing/test-case-matrix.md, TC-23..TC-27 la nghiep vu GIANG VIEN (tao Lab, khai class,
-- MMD, testcase, dry-run). 5 khoi step sinh vien ben duoi dang muon nham cac ma do.
-- Huong xu ly: KHONG sua de file nay (da chay). Viet 007_fix_tc_code_conflict.sql de:
--   1) them 5 dong test_cases cho TC-34..TC-38 (MMD view, missing class, example TC, hidden TC, history);
--   2) tro lai tc_code cua cac step/data dang mang TC-23..TC-27 sang TC-34..TC-38.
-- TC-28, TC-29, TC-30 trong file nay DUNG, giu nguyen.
--
-- Quy uoc:
--  * tc_code duoc gia dinh la 'TC-23' ... 'TC-30' (neu migration 002/003 dat ma khac, sua lai cot tc_code trong cac khoi UNION ben duoi).
--  * test_data la dang key-value: field_name la KHOA co dinh, spec Playwright doc qua helper,
--    vd: getTestData('TC-28', 'lab_name'). Spec giang vien viet moi doc du lieu qua helper ngay tu dau, KHONG hard-code.
--  * is_valid = TRUE: du lieu hop le/dung; FALSE: du lieu sai/truong KHONG duoc phep xuat hien (negative data).
--  * Gia tri trong data_value la du lieu mau, thay bang du lieu that cua he thong khi seed.

START TRANSACTION;

-- ======================================================================
-- STEPS
-- ======================================================================
INSERT INTO test_steps (test_id, step_order, step_action, step_target, expected_result)
SELECT c.test_id, s.step_order, s.step_action, s.step_target, s.expected_result
FROM test_cases c
JOIN (
  -- TC-23: Tab MMD Diagram - pass/fail class/relationship
  SELECT 'TC-23' COLLATE utf8mb4_unicode_ci AS tc_code, 1 AS step_order,
         'Dang nhap bang tai khoan sinh vien' AS step_action, 'Login form' AS step_target,
         'Dang nhap thanh cong, vao trang chu sinh vien' AS expected_result
  UNION ALL SELECT 'TC-23', 2, 'Mo lab da nop file .mmd va da co ket qua cham', 'Lab detail / Result page', 'Hien thi trang ket qua cham cua lan nop gan nhat'
  UNION ALL SELECT 'TC-23', 3, 'Click tab "MMD Diagram"', 'Tab MMD Diagram', 'Tab MMD Diagram duoc mo'
  UNION ALL SELECT 'TC-23', 4, 'Doi chieu danh sach class va relationship voi rubric', 'Danh sach class/relationship', 'Moi class/relationship hien dung trang thai pass/fail theo ket qua cham'

  -- TC-24: Phat hien thieu class / relationship sai
  UNION ALL SELECT 'TC-24', 1, 'Dang nhap bang tai khoan sinh vien', 'Login form', 'Dang nhap thanh cong'
  UNION ALL SELECT 'TC-24', 2, 'Mo lab va nop file .mmd thieu 1 class (hoac khai sai loai relationship)', 'Submit form / upload .mmd', 'Nop bai thanh cong, he thong bat dau cham'
  UNION ALL SELECT 'TC-24', 3, 'Cho cham xong, click tab "MMD Diagram"', 'Tab MMD Diagram', 'Hien thi ket qua cham MMD'
  UNION ALL SELECT 'TC-24', 4, 'Kiem tra muc class bi thieu va relationship sai', 'Danh sach class/relationship', 'Class thieu / relationship sai bi flag fail rieng le'
  UNION ALL SELECT 'TC-24', 5, 'Kiem tra cac class/relationship con lai', 'Danh sach class/relationship', 'Cac muc dung van hien pass, diagram khong bi danh fail toan bo'

  -- TC-25: Testcase example hien thi day du I/O
  UNION ALL SELECT 'TC-25', 1, 'Dang nhap bang tai khoan sinh vien va mo ket qua cham cua mot lan nop', 'Result page', 'Hien thi trang ket qua cham'
  UNION ALL SELECT 'TC-25', 2, 'Click tab "Testcase"', 'Tab Testcase', 'Hien thi danh sach testcase'
  UNION ALL SELECT 'TC-25', 3, 'Click expand vao 1 testcase loai example', 'Testcase card (example)', 'Card mo rong'
  UNION ALL SELECT 'TC-25', 4, 'Kiem tra noi dung card', 'Testcase card (example)', 'Hien day du input, expected output va actual output'

  -- TC-26: Testcase hidden chi hien pass/fail
  UNION ALL SELECT 'TC-26', 1, 'Dang nhap bang tai khoan sinh vien va mo ket qua cham cua mot lan nop', 'Result page', 'Hien thi trang ket qua cham'
  UNION ALL SELECT 'TC-26', 2, 'Click tab "Testcase"', 'Tab Testcase', 'Hien thi danh sach testcase'
  UNION ALL SELECT 'TC-26', 3, 'Click expand vao 1 testcase loai hidden', 'Testcase card (hidden)', 'Card mo rong'
  UNION ALL SELECT 'TC-26', 4, 'Kiem tra noi dung card', 'Testcase card (hidden)', 'Chi hien ket qua pass/fail'
  UNION ALL SELECT 'TC-26', 5, 'Tim input / expected output / actual output trong card va DOM', 'Testcase card (hidden)', 'KHONG ton tai input, expected, actual output (chong hard-code)'

  -- TC-27: Submission History
  UNION ALL SELECT 'TC-27', 1, 'Dang nhap bang tai khoan sinh vien da nop nhieu lan cho nhieu lab', 'Login form', 'Dang nhap thanh cong'
  UNION ALL SELECT 'TC-27', 2, 'Dieu huong den trang "Submission History"', 'Menu / Submission History', 'Trang lich su nop bai duoc mo'
  UNION ALL SELECT 'TC-27', 3, 'Kiem tra danh sach lich su nhom theo tung lab', 'Danh sach lab', 'Moi lab co danh sach cac lan nop'
  UNION ALL SELECT 'TC-27', 4, 'Kiem tra thong tin moi lan nop', 'Dong lich su nop', 'Co thoi diem nop, diem tong, ket qua tung challenge'

  -- TC-28: Lecturer Grading Dashboard
  UNION ALL SELECT 'TC-28', 1, 'Dang nhap bang tai khoan giang vien', 'Login form', 'Dang nhap thanh cong'
  UNION ALL SELECT 'TC-28', 2, 'Dieu huong den Grading Dashboard', 'Menu / Grading Dashboard', 'Trang Grading Dashboard duoc mo'
  UNION ALL SELECT 'TC-28', 3, 'Chon 1 lab da co sinh vien nop bai', 'Lab selector', 'Dashboard hien du lieu cua lab da chon'
  UNION ALL SELECT 'TC-28', 4, 'Kiem tra tong so bai nop va diem trung binh lop', 'Summary cards', 'Gia tri khop voi du lieu nop bai cua lab'
  UNION ALL SELECT 'TC-28', 5, 'Kiem tra bieu do cot breakdown diem theo tung challenge', 'Bar chart', 'Moi challenge co mot cot voi gia tri dung'
  UNION ALL SELECT 'TC-28', 6, 'Kiem tra bang sinh vien (ten, ma SV, diem cao nhat, so lan nop)', 'Student table', 'Du lieu day du va dung'
  UNION ALL SELECT 'TC-28', 7, 'Mot sinh vien nop bai moi, quan sat dashboard (khong reload)', 'Dashboard', 'So lieu va bang cap nhat real-time'

  -- TC-29: Cross-Lab Grade Matrix
  UNION ALL SELECT 'TC-29', 1, 'Dang nhap bang tai khoan giang vien', 'Login form', 'Dang nhap thanh cong'
  UNION ALL SELECT 'TC-29', 2, 'Dieu huong den "Grade Matrix"', 'Menu / Grade Matrix', 'Trang Grade Matrix duoc mo'
  UNION ALL SELECT 'TC-29', 3, 'Kiem tra cau truc bang', 'Matrix table', 'Hang = sinh vien, cot = lab'
  UNION ALL SELECT 'TC-29', 4, 'Doi chieu diem moi o voi diem cao nhat cua sinh vien o lab do', 'O diem (cell)', 'Gia tri o = diem cao nhat trong cac lan nop'

  -- TC-30: Grade Matrix - export
  UNION ALL SELECT 'TC-30', 1, 'Dang nhap bang tai khoan giang vien va mo "Grade Matrix"', 'Grade Matrix page', 'Bang ma tran hien thi'
  UNION ALL SELECT 'TC-30', 2, 'Click nut "Export"', 'Nut Export', 'Hien thi lua chon dinh dang Excel / PDF / SVG'
  UNION ALL SELECT 'TC-30', 3, 'Chon dinh dang export (lap lai cho tung dinh dang trong test data)', 'Export format option', 'He thong bat dau tao file'
  UNION ALL SELECT 'TC-30', 4, 'Kiem tra file tai ve', 'File download', 'Dung dinh dang va dung phan mo rong da chon'
  UNION ALL SELECT 'TC-30', 5, 'Mo file va doi chieu voi bang tren UI', 'Noi dung file', 'Du lieu trong file khop voi bang hien thi'
) s ON s.tc_code = c.tc_code;

-- ======================================================================
-- DATA (key-value; spec doc qua helper getTestData(tc_code, field_name))
-- ======================================================================
INSERT INTO test_data (test_id, field_name, data_value, is_valid)
SELECT c.test_id, d.field_name, d.data_value, d.is_valid
FROM test_cases c
JOIN (
  -- TC-23
  SELECT 'TC-23' COLLATE utf8mb4_unicode_ci AS tc_code, 'student_account' AS field_name,
         'student01@example.com' AS data_value, TRUE AS is_valid
  UNION ALL SELECT 'TC-23', 'lab_name',               'Lab 01 - ERD',                    TRUE
  UNION ALL SELECT 'TC-23', 'mmd_file',               'lab01_graded.mmd',                TRUE
  UNION ALL SELECT 'TC-23', 'expected_pass_items',    'class:Student;class:Course;rel:Student-Course:many-to-many', TRUE
  UNION ALL SELECT 'TC-23', 'expected_fail_items',    'rel:Course-Lecturer:one-to-many', FALSE

  -- TC-24
  UNION ALL SELECT 'TC-24', 'student_account',        'student01@example.com',           TRUE
  UNION ALL SELECT 'TC-24', 'lab_name',               'Lab 01 - ERD',                    TRUE
  UNION ALL SELECT 'TC-24', 'mmd_file_missing_class', 'lab01_missing_class.mmd',         FALSE
  UNION ALL SELECT 'TC-24', 'missing_class',          'Enrollment',                      FALSE
  UNION ALL SELECT 'TC-24', 'mmd_file_wrong_relation','lab01_wrong_relation.mmd',        FALSE
  UNION ALL SELECT 'TC-24', 'wrong_relationship',     'Student-Course: khai one-to-many thay vi many-to-many', FALSE

  -- TC-25
  UNION ALL SELECT 'TC-25', 'student_account',        'student01@example.com',           TRUE
  UNION ALL SELECT 'TC-25', 'testcase_type',          'example',                         TRUE
  UNION ALL SELECT 'TC-25', 'testcase_index',         '1',                               TRUE
  UNION ALL SELECT 'TC-25', 'expected_visible_fields','input;expected_output;actual_output', TRUE

  -- TC-26
  UNION ALL SELECT 'TC-26', 'student_account',        'student01@example.com',           TRUE
  UNION ALL SELECT 'TC-26', 'testcase_type',          'hidden',                          TRUE
  UNION ALL SELECT 'TC-26', 'testcase_index',         '1',                               TRUE
  UNION ALL SELECT 'TC-26', 'expected_visible_fields','status',                          TRUE
  UNION ALL SELECT 'TC-26', 'forbidden_fields',       'input;expected_output;actual_output', FALSE

  -- TC-27
  UNION ALL SELECT 'TC-27', 'student_account',        'student01@example.com',           TRUE
  UNION ALL SELECT 'TC-27', 'min_lab_count',          '2',                               TRUE
  UNION ALL SELECT 'TC-27', 'min_submissions_per_lab','2',                               TRUE
  UNION ALL SELECT 'TC-27', 'expected_columns',       'submitted_at;total_score;challenge_results', TRUE

  -- TC-28
  UNION ALL SELECT 'TC-28', 'lecturer_account',       'lecturer01@example.com',          TRUE
  UNION ALL SELECT 'TC-28', 'lab_name',               'Lab 01 - ERD',                    TRUE
  UNION ALL SELECT 'TC-28', 'expected_widgets',       'total_submissions;average_score;challenge_bar_chart;student_table', TRUE
  UNION ALL SELECT 'TC-28', 'student_table_columns',  'full_name;student_code;best_score;attempt_count', TRUE
  UNION ALL SELECT 'TC-28', 'realtime_student_account','student02@example.com',          TRUE

  -- TC-29
  UNION ALL SELECT 'TC-29', 'lecturer_account',       'lecturer01@example.com',          TRUE
  UNION ALL SELECT 'TC-29', 'matrix_rows',            'student',                         TRUE
  UNION ALL SELECT 'TC-29', 'matrix_columns',         'lab',                             TRUE
  UNION ALL SELECT 'TC-29', 'cell_rule',              'MAX(total_score) per student per lab', TRUE

  -- TC-30
  UNION ALL SELECT 'TC-30', 'lecturer_account',       'lecturer01@example.com',          TRUE
  UNION ALL SELECT 'TC-30', 'export_format',          'Excel',                           TRUE
  UNION ALL SELECT 'TC-30', 'export_format',          'PDF',                             TRUE
  UNION ALL SELECT 'TC-30', 'export_format',          'SVG',                             TRUE
  UNION ALL SELECT 'TC-30', 'expected_extension',     'Excel=xlsx;PDF=pdf;SVG=svg',      TRUE
) d ON d.tc_code = c.tc_code;

COMMIT;