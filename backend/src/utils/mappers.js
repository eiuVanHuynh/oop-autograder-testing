// The ONLY place that converts between DB conventions and API conventions.
// DB: snake_case, lowercase enums ('passed'). API/FE: camelCase, UPPERCASE ('PASSED').
//
// To do:
// - toApi(row) / toDb(obj): rename keys both ways.
// - status: 'passed' ↔ 'PASSED'. Never convert in a controller or repository, only here.
// - Never let password_hash slip through toApi().

// Helper converting snake_case to camelCase
const snakeToCamel = (str) => {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
};

// Helper converting camelCase to snake_case
const camelToSnake = (str) => {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
};

const toApi = (row) => {
  if (!row) return null;
  const apiObj = {};

  for (const key of Object.keys(row)) {
    // NEVER let password_hash or password slip through toApi()
    if (key === "password_hash" || key === "password") {
      continue;
    }

    const camelKey = snakeToCamel(key);
    let value = row[key];

    // Convert status / enum from lowercase (DB) to UPPERCASE (API/FE)
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

    // Convert status / enum from UPPERCASE (API/FE) back to lowercase (DB)
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
