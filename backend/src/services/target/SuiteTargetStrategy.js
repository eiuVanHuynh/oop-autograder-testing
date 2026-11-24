// target_json = { suiteId }: take the tc_code of every 'ready' test case in that suite.
// A suite yielding no test → an empty array; reporting 409 is runs.service's job.
//
// A suite carries no execution order of its own, so the order is decided here: by tc_code, counting
// the number as a number ('TC-2' before 'TC-10'). The resolver no longer sorts — it must not touch
// the order a template's testIds list carries (issue #67).
class SuiteTargetStrategy {
  constructor(catalogRepository) {
    this.catalogRepository = catalogRepository;
  }

  async resolve({ suiteId }) {
    const codes = await this.catalogRepository.findReadyCaseCodes(suiteId);
    return codes.sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  }
}

module.exports = SuiteTargetStrategy;
