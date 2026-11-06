const { z } = require("zod");

// Danh sách giá trị hợp lệ dùng chung — NGUỒN DUY NHẤT cho zod, GET /meta/options và FE.
// Trước đây mỗi schema tự viết lại z.enum([...]) nên test_type có hai bản trong cùng một file.
// Thêm một giá trị = sửa đúng một dòng ở đây.
// Nhận cả chữ HOA ở phía GHI: toApi trả enum dạng HOA ('NEW'), nên thứ FE vừa đọc được
// phải gửi lại nguyên dạng mà không bị 400.
const lowerEnum = (values) =>
  z.preprocess((v) => (typeof v === "string" ? v.toLowerCase() : v), z.enum(values));

// email LUÔN hạ chữ trước khi xuống DB: uq_users_email trên một số DB đang là UNIQUE(email)
// chứ không phải UNIQUE(lower(email)), nên 'A@b.co' lẽ ra trùng lại chèn được, rồi findByEmail
// (lower(email) … LIMIT 1) chọn một trong hai dòng — đăng nhập sai tài khoản.
// Mọi schema GHI email (register, admin tạo/sửa user) phải dùng field này.
const emailField = z.string().trim().toLowerCase().pipe(z.string().email());

module.exports = {
  lowerEnum,
  emailField,
  // Môi trường: mỗi giá trị cần một BASE_URL_<TÊN> ở phía backend và một secret cùng tên
  // bên GitHub Actions, nếu không thì POST /runs trả 400 (xem services/runner/TestRunner.js).
  ENVIRONMENTS: ["development", "testing", "staging", "production"],
  SCOPES: ["UI", "API", "DB"],
  TEMPLATE_STATUSES: ["active", "inactive"],
  CASE_PRIORITIES: ["low", "medium", "high", "critical"],
  CASE_TYPES: [
    "functional",
    "ui",
    "validation",
    "security",
    "performance",
    "usability",
    "audit",
  ],
  CASE_STATUSES: ["draft", "ready", "deprecated"],
  USER_ROLES: ["admin", "tester", "dev", "viewer"],
  USER_STATUSES: ["active", "inactive"],
  BUG_SEVERITIES: ["low", "medium", "high", "critical"],
  BUG_STATUSES: ["new", "in_progress", "fixed", "closed"],
};
