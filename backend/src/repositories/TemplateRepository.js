const BaseRepository = require('./BaseRepository');

// Truy vấn bảng mới test_templates – thứ người dùng chọn để chạy.
// Queries the new test_templates table – what the user picks to run.
//
// Cần làm / To do:
// - CRUD + tìm theo tên/phạm vi; trùng template_name → để lỗi UNIQUE nổi lên thành 409.
// - target_json là NOT NULL: template không trỏ tới test nào là template vô dụng.
// - Xóa template KHÔNG đụng tới lịch sử chạy (test_runs đã chụp grep vào config_json).
class TemplateRepository extends BaseRepository {
  constructor() {
    super('test_templates', 'template_id');
  }

  // TODO
}

module.exports = TemplateRepository;
