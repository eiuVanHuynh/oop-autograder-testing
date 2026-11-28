const UserRepository = require("../repositories/UserRepository");
const TemplateRepository = require("../repositories/TemplateRepository");
const AuthService = require("../services/auth.service");
const AuthController = require("../controllers/auth.controller");
const TemplatesService = require("../services/templates.service");
const CatalogRepository = require("../repositories/CatalogRepository");
const RunRepository = require("../repositories/RunRepository");
const LogRepository = require("../repositories/LogRepository");
const ResultRepository = require("../repositories/ResultRepository");
const RunsService = require("../services/runs.service");
const IngestService = require("../services/ingest.service");
const CatalogService = require("../services/catalog.service");
const UsersService = require("../services/users.service");
const BugsService = require("../services/bugs.service");
const BugRepository = require("../repositories/BugRepository");
const RerunRequestsService = require("../services/rerunRequests.service");
const RerunRequestRepository = require("../repositories/RerunRequestRepository");
const { createTargetResolver } = require("../services/target");
const { createRunner } = require("../services/runner");

// Factory wiring repositories into services, and services into controllers.
// Thanks to it, tests can build a service with a fake repository without a DI library.
//
// To do:
// - Each feature group adds exactly one line here once its service is done.
// - Keep this file pure wiring: no ifs, no business rules.

const userRepository = new UserRepository();
const templateRepository = new TemplateRepository();

const authService = new AuthService({ userRepository });
const authController = new AuthController(authService);

const catalogRepository = new CatalogRepository();
const templatesService = new TemplatesService({
  templateRepository,
  caseRepository: catalogRepository,
});
const catalogService = new CatalogService({ catalogRepository });
const runRepository = new RunRepository();
const logRepository = new LogRepository();
const resultRepository = new ResultRepository();
// testRunner stands apart because two places use it: running tests, and /meta/options asking it which
// environments are runnable — one source of truth, so the UI never offers what POST /runs would reject.
const testRunner = createRunner({
  logRepository,
  runRepository,
  resultRepository,
  catalogRepository,
});
const runsService = new RunsService({
  runRepository,
  templateRepository,
  logRepository,
  targetResolver: createTargetResolver({ catalogRepository }),
  testRunner,
  resultRepository,
});

const usersService = new UsersService({ userRepository });
const bugsService = new BugsService({
  bugRepository: new BugRepository(),
  resultRepository,
});

const rerunRequestsService = new RerunRequestsService({
  rerunRequestRepository: new RerunRequestRepository(),
  runRepository,
});

const ingestService = new IngestService({
  runRepository,
  logRepository,
  resultRepository,
  catalogRepository,
});

module.exports = {
  authController,
  ingestService,
  templatesService,
  runsService,
  catalogService,
  usersService,
  bugsService,
  rerunRequestsService,
  testRunner,
  userRepository, // requireAuth needs it to check whether the account is locked
};
