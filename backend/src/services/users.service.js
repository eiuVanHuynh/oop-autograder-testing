// Quản lý thành viên – chỉ Admin.
// Member management – Admin only.
// Quy tắc nghiệp vụ nằm ở đây. Không require pg, không chạm req/res.
// Business rules live here. Never require pg, never touch req/res.
// Nhận repository qua constructor để test thay được bằng bản giả.
// Takes its repositories through the constructor so tests can pass fakes.
//
// Cần làm / To do:
- Admin không được tự hạ quyền hay tự khóa mình → 400 (tránh hệ thống hết Admin).
// - Khuyến nghị khóa thay vì xóa, để lịch sử 'ai chạy test nào' không mất.
class UsersService {
  constructor(deps = {}) {
    // TODO: nhận repository cần dùng từ config/container.js
  }

  // TODO
}

module.exports = UsersService;
