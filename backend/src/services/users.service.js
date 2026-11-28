const bcrypt = require("bcryptjs");
const AppError = require("../utils/AppError");
const { toApi } = require("../utils/mappers");

const ADMIN_PROTECTED =
  "An admin account cannot be demoted, locked or deleted through the API — change it directly in the DB if you really must";

// Member management – Admin only.
// Business rules live here. No pg require, no touching req/res.
// Takes repositories through the constructor so tests can swap in fakes.
class UsersService {
  constructor({ userRepository }) {
    if (!userRepository) throw new Error("UsersService is missing a dependency: userRepository");
    this.userRepository = userRepository;
  }

  async getUsers(filters = {}) {
    const { data, meta } = await this.userRepository.findAllWithFilters(filters);
    return { data: data.map((row) => toApi(row)), meta };
  }

  // An admin demoting or locking themselves is the fastest way to leave the system with no Admin at all
  // (api-endpoints.md section 2). Blocked here because this is the only place that knows "who is calling".
  _assertNotSelf(targetId, actorId, action) {
    if (Number(targetId) === Number(actorId)) {
      throw new AppError(400, "VALIDATION_ERROR", `You cannot ${action}`);
    }
  }

  // The UPDATE refuses admins by itself (see UserRepository). If nothing is written, re-read the row to
  // tell "no such user" apart from "this user is an admin and the rule forbids the change".
  async _afterChange(id, changed) {
    const user = await this.userRepository.findPublicById(id);
    if (!user) throw new AppError(404, "NOT_FOUND", "User not found");

    if (!changed) throw new AppError(409, "ADMIN_PROTECTED", ADMIN_PROTECTED);

    return toApi(user);
  }

  async changeRole(id, role, actorId) {
    this._assertNotSelf(id, actorId, "change your own role");
    return this._afterChange(id, await this.userRepository.updateRole(id, role));
  }

  // Locked = user_status 'inactive'; requireAuth blocks an old token on the very next call.
  async changeStatus(id, status, actorId) {
    this._assertNotSelf(id, actorId, "lock or unlock yourself");
    return this._afterChange(id, await this.userRepository.updateStatus(id, status));
  }

  async getUser(id) {
    const user = await this.userRepository.findPublicById(id);
    if (!user) throw new AppError(404, "NOT_FOUND", "User not found");
    return toApi(user);
  }

  // An admin creating an account for someone: unlike /auth/register, the role and status can be chosen.
  // Duplicate email → the repository returns 409 (uq_users_email), no check-then-write.
  // role: 'admin' can be created, but it is one-way — afterwards that account can no longer be demoted,
  // locked or deleted through the API (ADMIN_PROTECTED), just like updateRole already allows promotion to admin.
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

  // Full name / email only. Use changeRole / changeStatus for role or status.
  async updateUser(id, { fullName, email }) {
    const user = await this.userRepository.updateProfile(id, {
      full_name: fullName,
      email,
    });
    if (!user) throw new AppError(404, "NOT_FOUND", "User not found");
    return toApi(user);
  }

  // Đổi mật khẩu của chính mình. Không cần email service: người gọi đã có token hợp lệ VÀ phải
  // biết mật khẩu hiện tại, nên đây là bằng chứng sở hữu tài khoản đủ mạnh.
  async changeOwnPassword(userId, { currentPassword, newPassword }) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new AppError(404, "NOT_FOUND", "User not found");
    // Tài khoản Google chưa từng đặt mật khẩu: password_hash NULL, bcrypt.compare sẽ nổ thành 500.
    if (!user.password_hash) {
      throw new AppError(409, "NO_PASSWORD", "This account has no password to change");
    }
    if (!(await bcrypt.compare(currentPassword, user.password_hash))) {
      throw new AppError(401, "INVALID_CREDENTIALS", "The current password is wrong");
    }
    if (await bcrypt.compare(newPassword, user.password_hash)) {
      throw new AppError(400, "VALIDATION_ERROR", "The new password must differ from the current one");
    }
    await this.userRepository.updatePassword(userId, await bcrypt.hash(newPassword, 10));
  }

  // Admin đặt lại mật khẩu cho người dùng đã quên. Đây là luồng "quên mật khẩu" thật sự dùng được
  // của hệ thống: không có email service nên không thể gửi link đặt lại (xem ô cảnh báo trong
  // auth.service.js). Admin đổi xong thì nói lại mật khẩu tạm cho người đó, họ tự đổi bằng
  // PATCH /users/me/password.
  //
  // Không cho đặt lại mật khẩu của một admin khác: đó là chiếm tài khoản, và cùng một luật với
  // ADMIN_PROTECTED ở updateRole/updateStatus/deleteNonAdmin. Admin tự đổi của mình qua /users/me/password.
  async resetUserPassword(id, newPassword, actorId) {
    this._assertNotSelf(id, actorId, "reset your own password here — use PATCH /users/me/password");

    const user = await this.userRepository.findPublicById(id);
    if (!user) throw new AppError(404, "NOT_FOUND", "User not found");
    if (user.user_role === "admin") throw new AppError(409, "ADMIN_PROTECTED", ADMIN_PROTECTED);

    await this.userRepository.updatePassword(id, await bcrypt.hash(newPassword, 10));
  }

  // Hard delete: the name of whoever ran a test is lost with it (FK ON DELETE SET NULL). Locking the account
  // is the recommended path — see api-endpoints.md section 2.
  async deleteUser(id, actorId) {
    this._assertNotSelf(id, actorId, "delete yourself");
    if (await this.userRepository.deleteNonAdmin(id)) return;

    const user = await this.userRepository.findPublicById(id);
    if (!user) throw new AppError(404, "NOT_FOUND", "User not found");
    throw new AppError(409, "ADMIN_PROTECTED", ADMIN_PROTECTED);
  }
}

module.exports = UsersService;
