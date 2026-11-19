const asyncHandler = require("../utils/asyncHandler");
const { testRunner } = require("../config/container");
const options = require("../validators/options");

// The available options, so the UI hard-codes nothing (api-endpoints.md section 12).
// Thin controller: no business rules at all — it just reads the shared enum lists.

// environments: ask the test runner itself, since it decides whether POST /runs returns 400.
// Reading env.BASE_URLS here would create two sources of truth: with RUNNER=github the URLs live in GitHub
// Secrets (invisible to the backend), and with RUNNER=fake every environment is runnable.
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
