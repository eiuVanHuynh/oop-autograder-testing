-- 009: du lieu mau de test endpoint /templates va /runs.
-- 1 suite -> 1 spec -> 2 test case 'ready' -> 2 template (1 kieu suiteId, 1 kieu testIds).
-- Chay lai duoc nhieu lan. KHONG dung tren production.

INSERT INTO test_suites (suite_name, suite_description, created_by)
SELECT 'Demo Suite', 'Suite mau cho ban dev local',
       (SELECT user_id FROM users WHERE email = 'admin@eiu.edu.vn')
WHERE NOT EXISTS (SELECT 1 FROM test_suites WHERE suite_name = 'Demo Suite');

INSERT INTO test_specs (spec_code, suite_id, screen_name, spec_description, created_by)
SELECT 'SPEC-DEMO-01',
       (SELECT suite_id FROM test_suites WHERE suite_name = 'Demo Suite'),
       'Login', 'Dac ta mau cho man hinh dang nhap',
       (SELECT user_id FROM users WHERE email = 'admin@eiu.edu.vn')
WHERE NOT EXISTS (SELECT 1 FROM test_specs WHERE spec_code = 'SPEC-DEMO-01');

INSERT INTO test_cases
  (spec_id, tc_code, title, preconditions, expected_result, priority, test_type, test_status)
SELECT (SELECT spec_id FROM test_specs WHERE spec_code = 'SPEC-DEMO-01'),
       v.tc_code, v.title, 'Da mo trang dang nhap', v.expected, v.priority, 'functional', 'ready'
FROM (VALUES
  ('TC-DEMO-01', 'Dang nhap dung mat khau', 'Vao duoc Dashboard',    'high'),
  ('TC-DEMO-02', 'Dang nhap sai mat khau',  'Hien thong bao loi',    'medium')
) AS v(tc_code, title, expected, priority)
WHERE NOT EXISTS (SELECT 1 FROM test_cases c WHERE c.tc_code = v.tc_code);

-- target_json kieu { testIds: [...] }: chay dung 2 test tren
INSERT INTO test_templates (template_name, description, scope, target_json, env, timeout, created_by)
SELECT 'Demo Login Template', 'Template mau tro toi 2 test case theo tc_code', 'UI',
       '{"testIds": ["TC-DEMO-01", "TC-DEMO-02"]}'::jsonb,
       'development', 30000,
       (SELECT user_id FROM users WHERE email = 'admin@eiu.edu.vn')
WHERE NOT EXISTS (SELECT 1 FROM test_templates WHERE template_name = 'Demo Login Template');

-- target_json kieu { suiteId }: chay ca suite
INSERT INTO test_templates (template_name, description, scope, target_json, env, timeout, created_by)
SELECT 'Demo Suite Template', 'Template mau tro toi ca mot suite', 'UI',
       jsonb_build_object('suiteId',
         (SELECT suite_id FROM test_suites WHERE suite_name = 'Demo Suite')),
       'development', 60000,
       (SELECT user_id FROM users WHERE email = 'admin@eiu.edu.vn')
WHERE NOT EXISTS (SELECT 1 FROM test_templates WHERE template_name = 'Demo Suite Template');
