const BaseRepository = require('./BaseRepository');

// Bảng tạm run_logs cho khung log trực tiếp.
// Temporary run_logs table behind the live log panel.
//
// Cần làm / To do:
// - append(runId, seq, level, message) và findAfter(runId, seq) cho polling.
// - purge(runId): xóa log khi lần chạy kết thúc. Đây là dữ liệu tạm, đừng giữ lâu.
class LogRepository extends BaseRepository {
  constructor() {
    super('run_logs', 'log_id');
  }

  // TODO
}

module.exports = LogRepository;
