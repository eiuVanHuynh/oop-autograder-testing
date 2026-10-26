-- CHỈ DÙNG CHO MÁY DEV. Không chạy trên DB thật / production.
-- Tạo 2 tài khoản + 1 suite có 4 test case để thử API. Chạy lại nhiều lần vẫn an toàn.
--   admin@dev.local  / Admin@123   (role admin)
--   viewer@dev.local / Viewer@123  (role viewer)
-- Mật khẩu băm bằng pgcrypto (bcrypt, tiền tố $2a$10$), bcryptjs của backend so khớp được.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO users (full_name, email, password_hash, auth_provider, user_role)
VALUES
  ('Dev Admin',  'admin@dev.local',  crypt('Admin@123',  gen_salt('bf', 10)), 'LOCAL', 'admin'),
  ('Dev Viewer', 'viewer@dev.local', crypt('Viewer@123', gen_salt('bf', 10)), 'LOCAL', 'viewer')
ON CONFLICT ((lower(email))) DO NOTHING;

DO $$
DECLARE
  v_suite INTEGER;
  v_spec  INTEGER;
BEGIN
  SELECT suite_id INTO v_suite FROM test_suites WHERE suite_name = 'DEV Smoke Suite';
  IF v_suite IS NULL THEN
    INSERT INTO test_suites (suite_name, suite_description)
    VALUES ('DEV Smoke Suite', 'Dữ liệu mẫu để thử API chạy test')
    RETURNING suite_id INTO v_suite;
  END IF;

  INSERT INTO test_specs (spec_code, suite_id, screen_name)
  VALUES ('SPEC-DEV-01', v_suite, 'Login')
  ON CONFLICT (spec_code) DO NOTHING;

  SELECT spec_id INTO v_spec FROM test_specs WHERE spec_code = 'SPEC-DEV-01';

  -- 3 test 'ready' + 1 test 'draft' (draft không bao giờ được đưa vào lần chạy).
  INSERT INTO test_cases (spec_id, tc_code, title, expected_result, priority, test_type, test_status)
  VALUES
    (v_spec, 'TC-DEV-01', 'Login hợp lệ',      'Vào được dashboard', 'high',   'functional', 'ready'),
    (v_spec, 'TC-DEV-02', 'Sai mật khẩu',      'Hiện thông báo lỗi', 'high',   'validation', 'ready'),
    (v_spec, 'TC-DEV-03', 'Email để trống',    'Báo bắt buộc nhập',  'medium', 'validation', 'ready'),
    (v_spec, 'TC-DEV-04', 'Test chưa hoàn tất','(đang soạn)',        'low',    'ui',         'draft')
  ON CONFLICT (tc_code) DO NOTHING;
END $$;

-- Kiểm tra nhanh: SuiteId dùng cho template theo suite
SELECT s.suite_id, s.suite_name,
       COUNT(*) FILTER (WHERE c.test_status = 'ready') AS ready_cases
  FROM test_suites s
  JOIN test_specs sp ON sp.suite_id = s.suite_id
  JOIN test_cases c  ON c.spec_id = sp.spec_id
 WHERE s.suite_name = 'DEV Smoke Suite'
 GROUP BY s.suite_id, s.suite_name;
