// target_json = { suiteId }: take the tc_code of every 'ready' test case in that suite.
// A suite yielding no test → an empty array; reporting 409 is runs.service's job.
class SuiteTargetStrategy {
  constructor(catalogRepository) {
    this.catalogRepository = catalogRepository;
  }

  async resolve({ suiteId }) {
    return this.catalogRepository.findReadyCaseCodes(suiteId);
  }
}

module.exports = SuiteTargetStrategy;
