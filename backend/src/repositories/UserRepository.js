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
    const res = await query("SELECT * FROM users WHERE email = $1 LIMIT 1", [
      email,
    ]);
    return res.rows[0] || null;
  }

  // Cột là user_role / user_status, không phải role / status
  // (db/schema/test_automation_db_schema.sql mục 1).
  async updateRole(userId, role) {
    const res = await query(
      "UPDATE users SET user_role = $1 WHERE user_id = $2",
      [role, userId],
    );
    return res.rowCount > 0;
  }

  async updateStatus(userId, status) {
    const res = await query(
      "UPDATE users SET user_status = $1 WHERE user_id = $2",
      [status, userId],
    );
    return res.rowCount > 0;
  }
}

module.exports = UserRepository;
