const { query } = require('../config/db');

// Template Method: lớp này giữ toàn bộ SQL dùng chung, repo con chỉ khai tên bảng.
// Template Method: this class holds all the shared SQL; subclasses only name the table.
// Đây là tầng DUY NHẤT được viết SQL. Service gọi repository, không gọi db.
// This is the ONLY layer allowed to write SQL. Services call repositories, never the db.
//
// Cần làm / To do:
// - findById, findAll(filter), paginate({ page, pageSize }), insert, update, remove.
// - Luôn dùng tham số hóa ($1, $2…), không nối chuỗi SQL — tránh SQL injection.
// - Trả về bản ghi thô (snake_case). Việc đổi sang camelCase là của utils/mappers.js.
// - Repo con cần câu SQL riêng thì tự viết thêm method, không sửa lớp này.
class BaseRepository {
  constructor(tableName, primaryKey) {
    this.tableName = tableName;
    this.primaryKey = primaryKey;
  }

  // TODO: findById / findAll / paginate / insert / update / remove
}

module.exports = BaseRepository;
