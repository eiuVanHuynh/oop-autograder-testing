// Danh sách lựa chọn dùng chung cho Templates và Tạo Test.
// Shared option lists for Templates and Create Test.
//
// BACKEND-TODO: lấy ENVIRONMENTS từ GET /meta/options (🟡) thay vì ghi cứng.
// Giá trị `value` là chuỗi gửi lên backend (cột env); chỉ 'development' là chắc chắn
// (mặc định trong templates.schema.js). 3 giá trị còn lại cần xác nhận với backend.
export const ENVIRONMENTS = [
  { value: "development", label: "Development" },
  { value: "testing", label: "Testing Sandbox" },
  { value: "staging", label: "Staging Lab" },
  { value: "production", label: "Production Cert" },
];

// Phải khớp z.enum(["UI","API","DB"]) trong templates.schema.js của backend;
// gửi giá trị khác là 400 và người dùng chỉ thấy "Invalid input."
export const SCOPES = ["UI", "API", "DB"];

export const envLabel = (value) =>
  ENVIRONMENTS.find((e) => e.value === value)?.label ?? value;

export const CASE_TYPES = [
  "functional",
  "ui",
  "validation",
  "security",
  "performance",
  "usability",
  "audit",
];
export const CASE_PRIORITIES = ["low", "medium", "high", "critical"];
export const CASE_STATUSES = ["draft", "ready", "deprecated"];
