-- 014: index cho các cột mà endpoint đang LỌC và JOIN theo.
--
-- Postgres tự tạo index cho PRIMARY KEY và UNIQUE, nhưng KHÔNG tự tạo cho khóa ngoại. Mọi
-- truy vấn dưới đây hiện quét tuần tự cả bảng; với dữ liệu seed (33 test case) thì không thấy,
-- nhưng mỗi lần chạy test lại sinh thêm dòng test_results và run_logs nên nó chỉ xấu dần.
--
-- Đã có sẵn, không lặp lại ở đây: run_logs UNIQUE (run_id, seq), test_results UNIQUE (run_id,
-- execution_id), users UNIQUE lower(email), test_runs (created_at DESC), bugs (status), bugs (result_id).

-- Trang Lịch sử tính status + số pass/fail cho TỪNG dòng bằng một subquery
-- "DISTINCT ON (test_id) ... ORDER BY test_id, execution_id DESC" trong một run
-- (RunRepository.LAST_PER_CASE). Index này biến nó thành một lần đọc index thay vì quét bảng.
CREATE INDEX IF NOT EXISTS ix_results_run_case ON test_results (run_id, test_id, execution_id DESC);

-- GET /runs/:id/results JOIN test_cases theo test_id; xóa một test case cũng phải tìm theo cột này.
CREATE INDEX IF NOT EXISTS ix_results_case ON test_results (test_id);

-- GET /ingest/runs/:id/plan đọc steps và data của cả lô case: WHERE test_id = ANY($1::int[]).
CREATE INDEX IF NOT EXISTS ix_steps_case ON test_steps (test_id);
CREATE INDEX IF NOT EXISTS ix_data_case  ON test_data  (test_id);

-- GET /runs/:id/results và /runs/:id/results/:resultId/evidences JOIN bằng chứng theo result_id.
CREATE INDEX IF NOT EXISTS ix_evidences_result ON test_evidences (result_id);

-- Đếm case 'ready' của một suite (ready_count của template, trang chọn target) đi
-- test_cases → test_specs → test_suites bằng hai khóa ngoại này.
CREATE INDEX IF NOT EXISTS ix_cases_spec  ON test_cases (spec_id);
CREATE INDEX IF NOT EXISTS ix_specs_suite ON test_specs (suite_id);

-- Mã test case dùng ở khắp nơi là một BIỂU THỨC, không phải một cột:
--   COALESCE(NULLIF(automation_ref, ''), tc_code)   (CatalogRepository.CODE_EXPR)
-- Index thường trên tc_code không giúp được gì cho nó. Đây là chỗ WHERE của
-- findCasesByCodes, findReadyCodesByTcCodes và ResultRepository.recordMany.
CREATE INDEX IF NOT EXISTS ix_cases_code_expr
  ON test_cases ((COALESCE(NULLIF(automation_ref, ''), tc_code)));
