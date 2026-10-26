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

  // ######################################################################
  // ##                                                                  ##
  // ##  CẢNH BÁO: HAI HÀM DƯỚI ĐÂY CHƯA HOÀN THIỆN                      ##
  // ##                                                                  ##
  // ##  create() và updatePassword() mới chỉ đủ chạy, CHƯA DÙNG ĐƯỢC    ##
  // ##  CHO PRODUCTION. Đọc kỹ phần "Còn thiếu" của từng hàm trước khi  ##
  // ##  gắn route /auth/register hay /auth/reset-password.              ##
  // ##                                                                  ##
  // ##  Ai hoàn thiện thì xoá khung này.                                ##
  // ##                                                                  ##
  // ######################################################################

  // shortcut: chưa hoàn thiện — chỉ đủ cho auth.service.register.
  // Còn thiếu:
  //   - Tài khoản GOOGLE: auth_provider đang hardcode 'LOCAL'.
  //   - Admin tạo user hộ (chọn user_role khác viewer) chưa có đường vào.
  //   - Email trùng: chỉ service chặn. Hai request đồng thời vẫn đụng
  //     uq_users_email, lỗi 23505 thô chưa map sang 409.
  // Không RETURNING password_hash, theo ghi chú đầu file.
  async create({ full_name, email, password_hash, user_role, user_status }) {
    const res = await this.query(
      `INSERT INTO ${this.tableName}
         (full_name, email, password_hash, auth_provider, user_role, user_status)
       VALUES ($1, $2, $3, 'LOCAL', $4, $5)
       RETURNING user_id, full_name, email, auth_provider, user_role, user_status, created_at`,
      [
        full_name,
        email,
        password_hash,
        user_role || "viewer",
        user_status || "active",
      ],
    );
    return res.rows[0];
  }

  // shortcut: chưa hoàn thiện — không tự kiểm quyền hay token.
  // Còn thiếu:
  //   - Caller (auth.service.resetPassword) PHẢI xác thực trước khi gọi;
  //     hàm này gọi là đổi, không hỏi gì.
  //   - Chưa vô hiệu hóa các JWT đã cấp trước đó. Hiện chỉ token reset tự hết
  //     hiệu lực vì nó ký kèm 10 ký tự đầu của password_hash cũ.
  async updatePassword(userId, passwordHash) {
    const res = await this.query(
      `UPDATE ${this.tableName} SET password_hash = $1 WHERE ${this.primaryKey} = $2`,
      [passwordHash, userId],
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
