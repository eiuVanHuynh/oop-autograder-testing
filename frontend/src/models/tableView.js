// Nhớ "bảng hay thẻ" cho từng danh sách. Cùng kiểu với models/theme.js: chỉ đọc/ghi
// localStorage, mọi truy cập bọc try/catch (chế độ ẩn danh có thể throw).
const KEY = (name) => `view:${name}`;

export const getTableView = (name) => {
  if (!name) return "table";
  try {
    return localStorage.getItem(KEY(name)) === "cards" ? "cards" : "table";
  } catch {
    return "table"; // chế độ ẩn danh chặn storage -> mặc định bảng
  }
};

export const setTableView = (name, view) => {
  if (!name) return;
  try {
    localStorage.setItem(KEY(name), view);
  } catch {
    /* không nhớ được thì thôi, phiên này vẫn đúng */
  }
};
