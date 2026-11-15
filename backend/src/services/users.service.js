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
