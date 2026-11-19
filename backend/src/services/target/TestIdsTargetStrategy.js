// target_json = { testIds: ['TC-05', …] }: run exactly the listed tests.
// Each code must exist and be 'ready'; unknown codes are dropped. That way a user-supplied string
// never reaches the --grep expression directly: only codes read back from the DB are used.
class TestIdsTargetStrategy {
  constructor(catalogRepository) {
    this.catalogRepository = catalogRepository;
  }

  async resolve({ testIds }) {
    const wanted = [...new Set(testIds.map(String))];
    return this.catalogRepository.findReadyCodesByTcCodes(wanted);
  }
}

module.exports = TestIdsTargetStrategy;
