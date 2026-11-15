const AppError = require('../../utils/AppError');
const SuiteTargetStrategy = require('./SuiteTargetStrategy');
const TestIdsTargetStrategy = require('./TestIdsTargetStrategy');

// Strategy: pick how a template's target_json becomes a list of tc_codes.
// Adding a new target kind (e.g. by tag) = one new file here + one line in `strategies`.
//
// The end result: an array of tc_codes filtered to test_status = 'ready', deduplicated, stably sorted.

const uniqSorted = (codes) =>
  [...new Set(codes)].sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));

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
    return uniqSorted(await found.strategy.resolve(target));
  };

  return {
    resolve,
    resolveToTestCodes: resolve, // the template's target_json
    resolveExplicitTestCodes: (testIds) => resolve({ testIds }), // POST /runs { testIds }
  };
}

module.exports = { createTargetResolver, buildGrep };
