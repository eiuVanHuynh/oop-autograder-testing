const TestRunner = require('./TestRunner');

// Bản chạy thật: kích hoạt .github/workflows/run-tests.yml bằng workflow_dispatch.
// The real implementation: triggers .github/workflows/run-tests.yml via workflow_dispatch.
//
// Cần làm / To do:
// - start: POST workflow_dispatch với input run_id + grep, dùng GITHUB_TOKEN (quyền actions:write).
// - Lấy ciRunId để sau này hủy được; lưu vào test_runs.ci_run_id.
// - cancel: gọi API hủy workflow run.
// - Actions mất 20–60 giây mới khởi động → đừng coi 'chưa có log' là lỗi.
// - Log Actions của repo public ai cũng xem được: không truyền bí mật qua input.
class GithubActionsRunner extends TestRunner {
  // TODO
}

module.exports = GithubActionsRunner;
