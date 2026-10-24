const BaseRepository = require('./BaseRepository');

// Truy vấn bảng test_runs.
// Queries the test_runs table.
//
// Cần làm / To do:
// - Lọc theo tên/trạng thái/khoảng ngày + phân trang cho trang Lịch sử.
// - KHÔNG có cột run_status: trạng thái tính ra từ finished_at và test_results (backend-design mục 6).
class RunRepository extends BaseRepository {
  constructor() {
    super('test_runs', 'run_id');
  }

  // TODO
}

module.exports = RunRepository;
