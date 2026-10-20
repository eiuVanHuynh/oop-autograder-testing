// Template – thứ người dùng chọn để chạy (bảng mới test_templates).
// Templates – what the user picks to run (the new test_templates table).
// Quy tắc nghiệp vụ nằm ở đây. Không require pg, không chạm req/res.
// Business rules live here. Never require pg, never touch req/res.
// Nhận repository qua constructor để test thay được bằng bản giả.
// Takes its repositories through the constructor so tests can pass fakes.
//
// Cần làm / To do:
- target_json bắt buộc: { suiteId } hoặc { testIds }. Thiếu → 400.
// - Trùng template_name → 409. Sửa/xóa template KHÔNG ảnh hưởng lịch sử chạy.
// - Nên trả kèm số test case 'ready' để giao diện chặn sớm template rỗng.
class TemplatesService {
  constructor(deps = {}) {
    // TODO: nhận repository cần dùng từ config/container.js
  }

  // TODO
}

module.exports = TemplatesService;
