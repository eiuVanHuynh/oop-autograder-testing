const BaseRepository = require("./BaseRepository");
const { query } = require("../config/db");
const AppError = require("../utils/AppError");

// uq_users_email bắt ở DB, không ở tầng service: hai request đồng thời cùng email thì
// chỉ một câu INSERT đi qua, request kia nhận 409 thay vì 500.
// Chỉ nhận đúng ràng buộc email — 23505 của users_pkey (sequence lệch sau khi seed id cố định)
// là lỗi khác, báo "email đã tồn tại" thì đi tìm sai chỗ.
const rethrowEmailTaken = (err) => {
  if (err.code === "23505" && err.constraint === "uq_users_email") {
    throw new AppError(409, "EMAIL_TAKEN", "Email already exists");
  }
  throw err;
};

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

  // Danh sách thành viên: tìm theo tên/email (q), lọc vai trò + trạng thái, phân trang.
  // KHÔNG chọn password_hash (ghi chú đầu file): nó không được rời repository.
  async findAllWithFilters(filters = {}) {
    const params = [];
    let where = " WHERE 1=1";

    if (filters.q) {
      params.push(`%${filters.q}%`);
      where += ` AND (full_name ILIKE $${params.length} OR email ILIKE $${params.length})`;
    }
    if (filters.role) {
      params.push(filters.role);
      where += ` AND user_role = $${params.length}`;
    }
    if (filters.status) {
      params.push(filters.status);
      where += ` AND user_status = $${params.length}`;
    }

    const countRes = await query(
      `SELECT COUNT(*)::int AS total FROM users${where}`,
      params,
    );

    const dataParams = [...params];
    let sql = `SELECT user_id, full_name, email, auth_provider, user_role, user_status, created_at
                 FROM users${where} ORDER BY user_id`;
    const limit = filters.limit ? Math.max(1, Number(filters.limit)) : null;
    const page = Math.max(1, Number(filters.page) || 1);
    if (limit) {
      dataParams.push(limit);
      sql += ` LIMIT $${dataParams.length}`;
      dataParams.push((page - 1) * limit);
      sql += ` OFFSET $${dataParams.length}`;
    }

    const res = await query(sql, dataParams);
    return {
      data: res.rows,
      meta: { page: limit ? page : 1, limit, total: countRes.rows[0].total },
    };
  }

  // Một thành viên, không kèm password_hash. Không có → null.
  async findPublicById(userId) {
    const res = await query(
      `SELECT user_id, full_name, email, auth_provider, user_role, user_status, created_at
         FROM users WHERE user_id = $1 LIMIT 1`,
      [userId],
    );
    return res.rows[0] || null;
  }

  async findByEmail(email) {
    const res = await query(
      "SELECT * FROM users WHERE lower(email) = lower($1) LIMIT 1",
      [email],
    );
    return res.rows[0] || null;
  }

  // Cột là user_role / user_status, không phải role / status
  // (db/schema/test_automation_db_schema.sql mục 1).
  //
  // "user_role <> 'admin'" nằm TRONG câu UPDATE, không kiểm trước rồi mới ghi: không ai được
  // hạ quyền hay khoá một admin qua API, và điều kiện ở ngay trong một câu SQL nên hai request
  // đồng thời không thể cùng đi qua (kiểm-rồi-ghi ở tầng service thì có thể).
  // rowCount = 0 → service đọc lại dòng để biết là 404 (không có) hay 409 (là admin).
  async updateRole(userId, role) {
    const res = await query(
      "UPDATE users SET user_role = $1 WHERE user_id = $2 AND user_role <> 'admin'",
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
    ).catch(rethrowEmailTaken);
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

  // Khoá admin thì không, nhưng MỞ khoá admin vẫn được: chặn cả chiều mở là tự khoá mình
  // khỏi một tài khoản đã bị khoá sẵn mà không có đường nào ngoài psql.
  async updateStatus(userId, status) {
    const res = await query(
      `UPDATE users SET user_status = $1
        WHERE user_id = $2 AND (user_role <> 'admin' OR $1 = 'active')`,
      [status, userId],
    );
    return res.rowCount > 0;
  }

  // Sửa hồ sơ: chỉ họ tên / email. Vai trò và trạng thái đi qua updateRole / updateStatus
  // vì hai cột đó có luật riêng (không hạ quyền admin).
  async updateProfile(userId, fields) {
    const params = [];
    const sets = [];
    for (const col of ["full_name", "email"]) {
      if (fields[col] !== undefined) {
        params.push(fields[col]);
        sets.push(`${col} = $${params.length}`);
      }
    }
    if (!sets.length) return this.findPublicById(userId);

    params.push(userId);
    const res = await query(
      `UPDATE users SET ${sets.join(", ")} WHERE user_id = $${params.length}
       RETURNING user_id, full_name, email, auth_provider, user_role, user_status, created_at`,
      params,
    ).catch(rethrowEmailTaken);
    return res.rows[0] || null;
  }

  // Xóa hẳn. Admin thì không (như updateRole/updateStatus) — khóa tài khoản là đường khuyến nghị.
  // Các FK trỏ tới users đều ON DELETE SET NULL nên lịch sử chạy test không mất, chỉ mất tên người chạy.
  async deleteNonAdmin(userId) {
    const res = await query(
      "DELETE FROM users WHERE user_id = $1 AND user_role <> 'admin'",
      [userId],
    );
    return res.rowCount > 0;
  }

}

module.exports = UserRepository;
