-- Dọn file bằng chứng cũ. KHÔNG phải migration: chạy định kỳ (xem phần lịch ở cuối file).
--
-- Quy tắc (thống nhất với nhóm):
--   * Case ĐẠT:    quá 7 ngày là xoá file — không ai mở lại ảnh của một case đã pass.
--   * Case KHÔNG ĐẠT: chỉ xoá khi nó KHÔNG còn là kết quả mới nhất của case đó. Lỗi chưa có lần
--     chạy nào sau đó chứng minh là đã sửa thì vẫn đang mở, mà ảnh là thứ duy nhất nói vì sao nó
--     hỏng — xoá đi là xoá mất bằng chứng của việc còn dang dở.
--
-- "Mới nhất" tính THEO TỪNG CASE (max(execution_id) của cùng test_id), không phải theo lần chạy
-- gần nhất của hệ thống: một run chỉ chạy 5 trong 30 case thì 25 case kia không vì thế mà cũ đi.
--
-- Xoá `content` chứ không xoá dòng: dòng vẫn ghi nhận "case này từng có ảnh, chụp lúc nào", mà chỗ
-- chiếm dung lượng thì được trả lại. Frontend chịu được: tải file trả 404 thì nó không hiện ảnh,
-- không vỡ trang (services/runService.js, getEvidenceDataUrl trả null).
UPDATE test_evidences e
   SET content = NULL,
       mime_type = NULL
  FROM test_results r
 WHERE e.result_id = r.execution_id
   AND e.content IS NOT NULL
   AND e.created_at < now() - interval '7 days'
   AND NOT (
     r.result_status <> 'passed'
     AND r.execution_id = (SELECT max(r2.execution_id)
                             FROM test_results r2
                            WHERE r2.test_id = r.test_id)
   );

-- Xem trước khi chạy thật: đổi UPDATE ở trên thành SELECT để đếm xem bao nhiêu dòng sẽ mất file.
--
-- Đặt lịch, chọn MỘT trong hai:
--   1) Supabase / Postgres có pg_cron — không cần code ứng dụng, đây là cách gọn nhất:
--        CREATE EXTENSION IF NOT EXISTS pg_cron;
--        SELECT cron.schedule('purge-evidences', '0 3 * * *', $$ <dán câu UPDATE ở trên> $$);
--   2) GitHub Actions chạy theo lịch, gọi psql bằng secret DATABASE_URL.
--
-- shortcut: không có trần cứng. Một case hỏng rồi không ai chạy lại sẽ giữ ảnh mãi — đúng ý đồ,
-- nhưng nếu kho phình thì thêm một vế "hoặc quá 90 ngày thì vẫn xoá".
