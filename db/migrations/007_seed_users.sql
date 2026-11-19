-- ============================================================
-- Migration 007: seed 5 tai khoan LOCAL de test dang nhap va phan quyen.
-- Schema thuc: db/schema/test_automation_db_schema.sql muc 1 (user_role, user_status).
-- Chay 1 lan trong DBeaver (Execute Script, Alt+X). Chay lai duoc: chi them email chua co.
--
-- MAT KHAU CHUNG CHO CA 5 TAI KHOAN: Test@1234
-- password_hash la bcrypt cost 10, sinh bang bcryptjs (dung thu vien backend dang dung).
-- CHI DUNG CHO MOI TRUONG DEV. Doi mat khau truoc khi dua len moi truong thuc.
--
-- locked@ de kiem tra 423 (tai khoan bi khoa -> user_status='inactive').
-- viewer@ de kiem tra 403 (Viewer khong duoc tao/sua/xoa template).
-- ============================================================
START TRANSACTION;

INSERT INTO users (full_name, email, password_hash, auth_provider, user_role, user_status)
SELECT 'Admin Demo', 'admin@eiu.edu.vn',
       '$2a$10$w5/.Mbp3adhazOpp4ioPI.y2BpeEyivKcqFzcyeqYdrSLCKYBJby6',
       'LOCAL', 'admin', 'active'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@eiu.edu.vn');

INSERT INTO users (full_name, email, password_hash, auth_provider, user_role, user_status)
SELECT 'Tester Demo', 'tester@eiu.edu.vn',
       '$2a$10$w5/.Mbp3adhazOpp4ioPI.y2BpeEyivKcqFzcyeqYdrSLCKYBJby6',
       'LOCAL', 'tester', 'active'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'tester@eiu.edu.vn');

INSERT INTO users (full_name, email, password_hash, auth_provider, user_role, user_status)
SELECT 'Dev Demo', 'dev@eiu.edu.vn',
       '$2a$10$w5/.Mbp3adhazOpp4ioPI.y2BpeEyivKcqFzcyeqYdrSLCKYBJby6',
       'LOCAL', 'dev', 'active'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'dev@eiu.edu.vn');

INSERT INTO users (full_name, email, password_hash, auth_provider, user_role, user_status)
SELECT 'Viewer Demo', 'viewer@eiu.edu.vn',
       '$2a$10$w5/.Mbp3adhazOpp4ioPI.y2BpeEyivKcqFzcyeqYdrSLCKYBJby6',
       'LOCAL', 'viewer', 'active'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'viewer@eiu.edu.vn');

INSERT INTO users (full_name, email, password_hash, auth_provider, user_role, user_status)
SELECT 'Locked Tester', 'locked@eiu.edu.vn',
       '$2a$10$w5/.Mbp3adhazOpp4ioPI.y2BpeEyivKcqFzcyeqYdrSLCKYBJby6',
       'LOCAL', 'tester', 'inactive'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'locked@eiu.edu.vn');

COMMIT;

-- Kiem tra nhanh sau khi chay:
-- SELECT user_id, email, user_role, user_status FROM users ORDER BY user_id;
