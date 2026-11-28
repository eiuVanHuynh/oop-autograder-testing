const AppError = require("../utils/AppError");
const { toApi } = require("../utils/mappers");
const parseJson = require("../utils/parseJson");

// Dev asks for a rerun, Admin/Tester approves or rejects (SRS section 4, issue #97).
// Business rules live here. No pg require, no touching req/res.
//
// Approving does NOT start the run: it only records the decision. The UI then opens the Run Test page
// with the old run's config filled in, so whoever approved still presses Run Test themselves.

class RerunRequestsService {
  constructor({ rerunRequestRepository, runRepository }) {
    Object.entries({ rerunRequestRepository, runRepository }).forEach(([name, dep]) => {
      if (!dep) throw new Error(`RerunRequestsService is missing a dependency: ${name}`);
    });
    this.rerunRequestRepository = rerunRequestRepository;
    this.runRepository = runRepository;
  }

  // runConfig is what the UI prefills the form with; a row holding broken JSON must not 500 the page.
  static present(row) {
    const api = toApi(row);
    api.runConfig = parseJson(row.run_config);
    return api;
  }

  async createForRun(runId, data, userId) {
    const run = await this.runRepository.findById(runId);
    if (!run) throw new AppError(404, "NOT_FOUND", "Run not found");

    try {
      return RerunRequestsService.present(
        await this.rerunRequestRepository.createRequest({
          run_id: runId,
          reason: data.reason,
          requested_by: userId,
        }),
      );
    } catch (err) {
      if (err.code === "23505") {
        throw new AppError(
          409,
          "REQUEST_PENDING",
          "This run already has a rerun request waiting for a decision",
        );
      }
      throw err;
    }
  }

  async getRequests(filters = {}) {
    const rows = await this.rerunRequestRepository.findAllWithFilters(filters);
    return rows.map((row) => RerunRequestsService.present(row));
  }

  // status: 'approved' | 'rejected'. Deciding twice is a 409, not a silent overwrite of who decided.
  async decide(id, status, userId) {
    const row = await this.rerunRequestRepository.decide(id, status, userId);
    if (row) return RerunRequestsService.present(row);

    const existing = await this.rerunRequestRepository.findById(id);
    if (!existing) throw new AppError(404, "NOT_FOUND", "Rerun request not found");
    throw new AppError(409, "ALREADY_DECIDED", `This request is already "${existing.status}"`);
  }
}

module.exports = RerunRequestsService;
