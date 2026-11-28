-- 015: lưu luôn BYTES của bằng chứng, không chỉ đường dẫn.
--
-- Vì sao: file_path mà Playwright đưa ra là đường dẫn trên runner của GitHub Actions — máy đó biến mất
-- khi workflow kết thúc, nên trang báo cáo không bao giờ hiện được ảnh. Vercel có filesystem chỉ đọc và
-- dự án không có object storage, nên chỗ duy nhất giữ được file là chính Postgres.
--
-- token: URL công khai của ảnh là /api/evidences/<token>. Phải là chuỗi không đoán được, vì thẻ <img>
-- trong báo cáo HTML tự chứa không gửi được header Authorization. evidence_id tuần tự thì ai cũng dò
-- được toàn bộ ảnh của mọi lần chạy.
ALTER TABLE test_evidences
  ADD COLUMN IF NOT EXISTS content   BYTEA,
  ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100),
  ADD COLUMN IF NOT EXISTS token     UUID;

-- Một phần (partial index): dòng cũ chỉ có đường dẫn, token NULL, và NULL không phá UNIQUE —
-- index đầy đủ cũng chạy được, nhưng partial nói rõ "chỉ dòng có file mới tra theo token".
CREATE UNIQUE INDEX IF NOT EXISTS ux_evidences_token ON test_evidences (token) WHERE token IS NOT NULL;
