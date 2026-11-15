const { z } = require("zod");

// The shared list of valid values — THE single source for zod, GET /meta/options and the FE.
// Each schema used to repeat z.enum([...]), so test_type existed twice in one file.
// Adding a value = editing exactly one line here.
// UPPERCASE is accepted on the WRITE side: toApi returns enums in uppercase ('NEW'), so what the FE just read
// can be sent back verbatim without a 400.
const lowerEnum = (values) =>
  z.preprocess((v) => (typeof v === "string" ? v.toLowerCase() : v), z.enum(values));

// email is ALWAYS lowercased before it hits the DB: on some DBs uq_users_email is UNIQUE(email)
// rather than UNIQUE(lower(email)), so 'A@b.co' would insert despite being a duplicate, and findByEmail
// (lower(email) … LIMIT 1) would pick one of the two rows — signing you into the wrong account.
// Every schema that WRITES an email (register, admin create/edit user) must use this field.
const emailField = z.string().trim().toLowerCase().pipe(z.string().email());

module.exports = {
  lowerEnum,
  emailField,
  // Environments: each value needs a BASE_URL_<NAME> on the backend and a secret of the same name
  // in GitHub Actions, otherwise POST /runs returns 400 (see services/runner/TestRunner.js).
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
