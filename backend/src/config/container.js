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
const { createTargetResolver } = require("../services/target");
const { createRunner } = require("../services/runner");

// Factory ráp sẵn repository vào service, và service vào controller.
// Factory that wires repositories into services, and services into controllers.
// Nhờ nó, test có thể dựng service với repository giả mà không cần thư viện DI.
// It lets tests build a service with a fake repository, with no DI library.
//
// Cần làm / To do:
// - Mỗi nhóm tính năng thêm đúng một dòng vào đây khi service của nhóm xong.
// - Giữ file này chỉ để nối dây: không có if, không có quy tắc nghiệp vụ.

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
const runsService = new RunsService({
  runRepository,
  templateRepository,
  logRepository,
  targetResolver: createTargetResolver({ catalogRepository }),
  testRunner: createRunner({ logRepository, runRepository, resultRepository, catalogRepository }),
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
  userRepository, // requireAuth cần để kiểm tra trạng thái khóa của tài khoản
};
