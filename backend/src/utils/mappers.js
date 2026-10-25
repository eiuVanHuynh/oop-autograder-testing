// Nơi DUY NHẤT đổi giữa quy ước DB và quy ước API.
// The ONLY place that converts between the DB and the API conventions.
// DB: snake_case, enum chữ thường ('passed'). API/FE: camelCase, chữ HOA ('PASSED').
// DB: snake_case, lowercase enums ('passed'). API/FE: camelCase, UPPERCASE ('PASSED').
//
// Cần làm / To do:
// - toApi(row) / toDb(obj): đổi tên khóa hai chiều.
// - status: 'passed' ↔ 'PASSED'. Đừng đổi ở controller hay repository, chỉ ở đây.
// - Không bao giờ để password_hash lọt qua toApi().

// Helper chuyển snake_case sang camelCase
const snakeToCamel = (str) => {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
};

// Helper chuyển camelCase sang snake_case
const camelToSnake = (str) => {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
};

const toApi = (row) => {
  if (!row) return null;
  const apiObj = {};

  for (const key of Object.keys(row)) {
    // KHÔNG BAO GIỜ để password_hash hoặc password lọt qua toApi()
    if (key === "password_hash" || key === "password") {
      continue;
    }

    const camelKey = snakeToCamel(key);
    let value = row[key];

    // Chuyển đổi status / enum từ chữ thường (DB) sang chữ HOA (API/FE)
    if (
      key === "status" ||
      key === "test_status" ||
      key === "run_status" ||
      key === "severity"
    ) {
      if (typeof value === "string") {
        value = value.toUpperCase();
      }
    }

    apiObj[camelKey] = value;
  }

  return apiObj;
};

const toDb = (obj) => {
  if (!obj) return null;
  const dbObj = {};

  for (const key of Object.keys(obj)) {
    const snakeKey = camelToSnake(key);
    let value = obj[key];

    // Chuyển đổi status / enum từ chữ HOA (API/FE) về chữ thường (DB)
    if (
      snakeKey === "status" ||
      snakeKey === "test_status" ||
      snakeKey === "run_status" ||
      snakeKey === "severity"
    ) {
      if (typeof value === "string") {
        value = value.toLowerCase();
      }
    }

    dbObj[snakeKey] = value;
  }

  return dbObj;
};

module.exports = { toApi, toDb };
