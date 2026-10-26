// target_json = { suiteId }: lấy tc_code của mọi test case 'ready' trong suite đó.
// target_json = { suiteId }: collect the tc_code of every 'ready' case in that suite.
// Suite không ra test nào → trả mảng rỗng; việc báo 409 là của runs.service.
class SuiteTargetStrategy {
  constructor(catalogRepository) {
    this.catalogRepository = catalogRepository;
  }

  async resolve({ suiteId }) {
    return this.catalogRepository.findReadyCaseCodes(suiteId);
  }
}

module.exports = SuiteTargetStrategy;
