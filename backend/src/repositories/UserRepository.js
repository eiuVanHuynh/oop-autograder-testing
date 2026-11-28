const BaseRepository = require("./BaseRepository");
const { query } = require("../config/db");
const AppError = require("../utils/AppError");

// uq_users_email is enforced by the DB, not the service layer: with two concurrent requests for the same email
// only one INSERT gets through, and the other gets a 409 instead of a 500.
// Only the email constraint is caught — a 23505 on users_pkey (sequence drift after seeding fixed ids)
// is a different bug, and reporting "email already exists" would send you looking in the wrong place.
const rethrowEmailTaken = (err) => {
  if (err.code === "23505" && err.constraint === "uq_users_email") {
    throw new AppError(409, "EMAIL_TAKEN", "Email already exists");
  }
  throw err;
};

// Queries against the users table.
//
// To do:
// - findByEmail (for login), role change, lock/unlock an account.
// - NEVER return password_hash outside the repository except when verifying a password.
class UserRepository extends BaseRepository {
  constructor() {
    super("users", "user_id");
  }

  // Member list: search by name/email (q), filter by role + status, paginated.
  // Does NOT select password_hash (see the note at the top): it must not leave the repository.
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

    // Đếm tổng và lấy trang không phụ thuộc nhau: chạy song song để chỉ mất một lượt đi-về DB.
    const [res, countRes] = await Promise.all([
      query(sql, dataParams),
      query(`SELECT COUNT(*)::int AS total FROM users${where}`, params),
    ]);
    return {
      data: res.rows,
      meta: { page: limit ? page : 1, limit, total: countRes.rows[0].total },
    };
  }

  // One member, without password_hash. Not found → null.
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

  // The columns are user_role / user_status, not role / status
  // (db/schema/test_automation_db_schema.sql section 1).
  //
  // "user_role <> 'admin'" lives INSIDE the UPDATE rather than being checked before writing: nobody can
  // demote or lock an admin through the API, and because the condition is part of a single SQL statement
  // two concurrent requests cannot both pass it (a check-then-write in the service layer could).
  // rowCount = 0 → the service re-reads the row to tell 404 (missing) from 409 (is an admin).
  async updateRole(userId, role) {
    const res = await query(
      "UPDATE users SET user_role = $1 WHERE user_id = $2 AND user_role <> 'admin'",
      [role, userId],
    );
    return res.rowCount > 0;
  }

  // ######################################################################
  // ##                                                                  ##
  // ##  WARNING: THE TWO FUNCTIONS BELOW ARE UNFINISHED                 ##
  // ##                                                                  ##
  // ##  create() and updatePassword() are only just runnable, NOT YET   ##
  // ##  PRODUCTION READY. Read each function's "Still missing" notes    ##
  // ##  before wiring up /auth/register or /auth/reset-password.        ##
  // ##                                                                  ##
  // ##  Whoever finishes this, delete this box.                         ##
  // ##                                                                  ##
  // ######################################################################

  // shortcut: unfinished — only enough for auth.service.register.
  // Still missing:
  //   - GOOGLE accounts: auth_provider is hardcoded to 'LOCAL'.
  //   - An admin creating a user on someone's behalf (picking a user_role other than viewer) has no path in.
  // No RETURNING password_hash, per the note at the top of the file.
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

  // shortcut: unfinished — it checks neither permissions nor tokens.
  // Still missing:
  //   - The caller (auth.service.resetPassword) MUST authenticate before calling;
  //     this function just changes the password, it asks nothing.
  //   - Previously issued JWTs are not invalidated. Today only the reset token expires
  //     on its own, because it is signed with the first 10 characters of the old password_hash.
  async updatePassword(userId, passwordHash) {
    const res = await this.query(
      `UPDATE ${this.tableName} SET password_hash = $1 WHERE ${this.primaryKey} = $2`,
      [passwordHash, userId],
    );
    return res.rowCount > 0;
  }

  // Locking an admin is refused, but UNLOCKING one is still allowed: blocking that direction too would leave
  // an already-locked account with no way back in except psql.
  async updateStatus(userId, status) {
    const res = await query(
      `UPDATE users SET user_status = $1
        WHERE user_id = $2 AND (user_role <> 'admin' OR $1 = 'active')`,
      [status, userId],
    );
    return res.rowCount > 0;
  }

  // Profile edit: full name / email only. Role and status go through updateRole / updateStatus
  // because those two columns have their own rule (no demoting an admin).
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

  // Hard delete. Not for an admin (same as updateRole/updateStatus) — locking the account is the recommended path.
  // Every FK pointing at users is ON DELETE SET NULL, so run history survives; only the runner's name is lost.
  async deleteNonAdmin(userId) {
    const res = await query(
      "DELETE FROM users WHERE user_id = $1 AND user_role <> 'admin'",
      [userId],
    );
    return res.rowCount > 0;
  }

}

module.exports = UserRepository;
