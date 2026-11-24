const AppError = require('../../utils/AppError');
const SuiteTargetStrategy = require('./SuiteTargetStrategy');
const TestIdsTargetStrategy = require('./TestIdsTargetStrategy');

// Strategy: pick how a template's target_json becomes a list of tc_codes.
// Adding a new target kind (e.g. by tag) = one new file here + one line in `strategies`.
//
// The end result: an array of tc_codes filtered to test_status = 'ready' and deduplicated,
// IN THE ORDER THE STRATEGY RETURNS THEM. This used to sort the codes alphabetically here, which
// threw away the execution order a template's target_json.testIds carries (issue #67). A suite has
// no order of its own, so SuiteTargetStrategy is the one that sorts.

const uniq = (codes) => [...new Set(codes)];

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// The --grep expression: `(TC-01|TC-02) -`. Keep the trailing ` -` so TC-01 does not match TC-010.
const buildGrep = (codes) =>
  codes.length ? `(${codes.map(escapeRegex).join('|')}) -` : '';

function createTargetResolver({ catalogRepository }) {
  const strategies = [
    {
      matches: (t) => t && t.suiteId != null,
      strategy: new SuiteTargetStrategy(catalogRepository),
    },
    {
      matches: (t) => t && Array.isArray(t.testIds) && t.testIds.length > 0,
      strategy: new TestIdsTargetStrategy(catalogRepository),
    },
  ];

  const resolve = async (target) => {
    const found = strategies.find((s) => s.matches(target));
    if (!found) {
      throw new AppError(400, 'VALIDATION_ERROR', 'target_json must have suiteId or testIds');
    }
    return uniq(await found.strategy.resolve(target));
  };

  return {
    resolve,
    resolveToTestCodes: resolve, // the template's target_json
    resolveExplicitTestCodes: (testIds) => resolve({ testIds }), // POST /runs { testIds }
  };
}

module.exports = { createTargetResolver, buildGrep };
