const AppError = require("../utils/AppError");
const { toApi } = require("../utils/mappers");

// Quản lý thành viên – chỉ Admin.
// Member management – Admin only.
// Quy tắc nghiệp vụ nằm ở đây. Không require pg, không chạm req/res.
// Nhận repository qua constructor để test thay được bằng bản giả.
class UsersService {
  constructor({ userRepository }) {
    if (!userRepository) throw new Error("UsersService thiếu phụ thuộc: userRepository");
    this.userRepository = userRepository;
  }

  async getUsers(filters = {}) {
    const { data, meta } = await this.userRepository.findAllWithFilters(filters);
    return { data: data.map((row) => toApi(row)), meta };
  }

  // Admin tự hạ quyền / tự khóa mình là cách nhanh nhất để hệ thống không còn Admin nào
  // (api-endpoints.md mục 2). Chặn ở đây vì đây là nơi duy nhất biết "ai đang gọi".
  _assertNotSelf(targetId, actorId, action) {
    if (Number(targetId) === Number(actorId)) {
      throw new AppError(400, "VALIDATION_ERROR", `Không thể tự ${action} chính mình`);
    }
  }

  // Câu UPDATE tự từ chối admin (xem UserRepository). Không ghi được thì đọc lại dòng để
  // phân biệt "không có user này" với "user này là admin, luật không cho đổi".
  async _afterChange(id, changed) {
    const user = await this.userRepository.findPublicById(id);
    if (!user) throw new AppError(404, "NOT_FOUND", "User not found");

    if (!changed) {
      throw new AppError(
        409,
        "ADMIN_PROTECTED",
        "Tài khoản admin không thể bị hạ quyền hay khoá qua API — đổi trực tiếp trong DB nếu thật sự cần",
      );
    }

    return toApi(user);
  }

  async changeRole(id, role, actorId) {
    this._assertNotSelf(id, actorId, "đổi vai trò");
    return this._afterChange(id, await this.userRepository.updateRole(id, role));
  }

  // Khóa = user_status 'inactive'; requireAuth chặn đăng nhập bằng token cũ ngay lần gọi sau.
  async changeStatus(id, status, actorId) {
    this._assertNotSelf(id, actorId, "khóa/mở khóa");
    return this._afterChange(id, await this.userRepository.updateStatus(id, status));
  }
}

module.exports = UsersService;
