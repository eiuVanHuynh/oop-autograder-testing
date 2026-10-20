// Nơi DUY NHẤT đổi giữa quy ước DB và quy ước API.
// The ONLY place that converts between the DB and the API conventions.
// DB: snake_case, enum chữ thường ('passed'). API/FE: camelCase, chữ HOA ('PASSED').
// DB: snake_case, lowercase enums ('passed'). API/FE: camelCase, UPPERCASE ('PASSED').
//
// Cần làm / To do:
// - toApi(row) / toDb(obj): đổi tên khóa hai chiều.
// - status: 'passed' ↔ 'PASSED'. Đừng đổi ở controller hay repository, chỉ ở đây.
// - Không bao giờ để password_hash lọt qua toApi().

const toApi = (row) => {
  // TODO
};

const toDb = (obj) => {
  // TODO
};

module.exports = { toApi, toDb };
