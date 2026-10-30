const asyncHandler = require("../utils/asyncHandler");
const { testRunner } = require("../config/container");
const options = require("../validators/options");

// Các lựa chọn có sẵn, để giao diện không ghi cứng (api-endpoints.md mục 12).
// Controller mỏng: không có quy tắc nghiệp vụ nào — chỉ đọc danh sách enum dùng chung.

// environments: hỏi chính bộ chạy test, vì nó là nơi quyết định POST /runs có 400 hay không.
// Đọc env.BASE_URLS ở đây thì có hai nguồn chân lý: với RUNNER=github URL nằm ở GitHub
// Secrets (backend không thấy), với RUNNER=fake thì môi trường nào cũng chạy được.
const getOptions = asyncHandler(async (_req, res) => {
  res.status(200).json({
    data: {
      environments: options.ENVIRONMENTS.filter(
        (name) => testRunner.checkEnv(name) === null,
      ),
      scopes: options.SCOPES,
      templateStatuses: options.TEMPLATE_STATUSES,
      casePriorities: options.CASE_PRIORITIES,
      caseTypes: options.CASE_TYPES,
      caseStatuses: options.CASE_STATUSES,
      userRoles: options.USER_ROLES,
      userStatuses: options.USER_STATUSES,
      bugSeverities: options.BUG_SEVERITIES,
      bugStatuses: options.BUG_STATUSES,
    },
  });
});

module.exports = { getOptions };
