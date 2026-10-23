const BaseRepository = require("./BaseRepository");
const { query } = require("../config/db");

// Truy vấn bảng users.
// Queries the users table.
//
// Cần làm / To do:
// - findByEmail (cho đăng nhập), đổi vai trò, khóa/mở khóa tài khoản.
// - KHÔNG BAO GIỜ trả password_hash ra ngoài repository trừ lúc so khớp mật khẩu.
class UserRepository extends BaseRepository {
  constructor() {
    super("users", "user_id");
  }

  // TODO
  async findByEmail(email) {
    const rows = await query("SELECT * FROM users WHERE email = ? LIMIT 1", [
      email,
    ]);
    return rows[0] || null;
  }

  async updateRole(userId, role) {
    const result = await query("UPDATE users SET role = ? WHERE user_id = ?", [
      role,
      userId,
    ]);
    return result.affectedRows > 0;
  }

  async updateStatus(userId, status) {
    const result = await query(
      "UPDATE users SET status = ? WHERE user_id = ?",
      [status, userId],
    );
    return result.affectedRows > 0;
  }
}

module.exports = UserRepository;
