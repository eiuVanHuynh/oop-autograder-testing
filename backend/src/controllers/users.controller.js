const asyncHandler = require('../utils/asyncHandler');

// Quản lý thành viên – chỉ Admin.
// Member management – Admin only.
// Controller mỏng: đọc req → gọi service → res.json({ data }). Không có quy tắc nghiệp vụ.
// Thin controller: read req → call the service → res.json({ data }). No business rules here.
//
// Cần làm / To do:
- Danh sách có lọc/phân trang, đổi vai trò, khóa/mở khóa, tự sửa hồ sơ, đổi mật khẩu.
// - Trả đúng status code ghi trong api-endpoints.md mục 2.

// TODO: các hàm xử lý, bọc trong asyncHandler

module.exports = {};
