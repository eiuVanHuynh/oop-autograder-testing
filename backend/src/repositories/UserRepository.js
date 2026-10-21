const BaseRepository = require('./BaseRepository');

// Truy vấn bảng users.
// Queries the users table.
//
// Cần làm / To do:
// - findByEmail (cho đăng nhập), đổi vai trò, khóa/mở khóa tài khoản.
// - KHÔNG BAO GIỜ trả password_hash ra ngoài repository trừ lúc so khớp mật khẩu.
class UserRepository extends BaseRepository {
  constructor() {
    super('users', 'user_id');
  }

  // TODO
}

module.exports = UserRepository;
