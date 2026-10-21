const BaseRepository = require('./BaseRepository');

// Truy vấn test_results và bằng chứng kèm theo.
// Queries test_results and their attached evidence.
//
// Cần làm / To do:
// - Ghi nhiều kết quả một lần (bulk insert) cho /ingest/runs/:id/results.
// - Đọc theo run để dựng bảng từng bước ở trang báo cáo.
class ResultRepository extends BaseRepository {
  constructor() {
    super('test_results', 'result_id');
  }

  // TODO
}

module.exports = ResultRepository;
