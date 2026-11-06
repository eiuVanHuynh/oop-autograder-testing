const bcrypt = require("bcryptjs");
const AppError = require("../utils/AppError");
const { toApi } = require("../utils/mappers");

const ADMIN_PROTECTED =
  "Tài khoản admin không thể bị hạ quyền, khoá hay xoá qua API — đổi trực tiếp trong DB nếu thật sự cần";

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

    if (!changed) throw new AppError(409, "ADMIN_PROTECTED", ADMIN_PROTECTED);

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

  async getUser(id) {
    const user = await this.userRepository.findPublicById(id);
    if (!user) throw new AppError(404, "NOT_FOUND", "User not found");
    return toApi(user);
  }

  // Admin tạo tài khoản hộ: khác /auth/register ở chỗ được chọn vai trò và trạng thái.
  // Email trùng → repository trả 409 (uq_users_email), không kiểm trước rồi mới ghi.
  // role: 'admin' tạo được, nhưng là một chiều — sau đó không hạ quyền / khoá / xoá
  // tài khoản đó qua API được nữa (ADMIN_PROTECTED), giống updateRole đã cho nâng lên admin.
  async createUser({ fullName, email, password, role, status }) {
    const user = await this.userRepository.create({
      full_name: fullName,
      email,
      password_hash: await bcrypt.hash(password, 10),
      user_role: role,
      user_status: status,
    });
    return toApi(user);
  }

  // Chỉ họ tên / email. Đổi vai trò hay trạng thái dùng changeRole / changeStatus.
  async updateUser(id, { fullName, email }) {
    const user = await this.userRepository.updateProfile(id, {
      full_name: fullName,
      email,
    });
    if (!user) throw new AppError(404, "NOT_FOUND", "User not found");
    return toApi(user);
  }

  // Xóa hẳn: mất luôn tên người đã chạy test (FK ON DELETE SET NULL). Khóa tài khoản
  // là đường khuyến nghị — xem api-endpoints.md mục 2.
  async deleteUser(id, actorId) {
    this._assertNotSelf(id, actorId, "xóa");
    if (await this.userRepository.deleteNonAdmin(id)) return;

    const user = await this.userRepository.findPublicById(id);
    if (!user) throw new AppError(404, "NOT_FOUND", "User not found");
    throw new AppError(409, "ADMIN_PROTECTED", ADMIN_PROTECTED);
  }
}

module.exports = UsersService;
