const AppError = require('../../utils/AppError');
const SuiteTargetStrategy = require('./SuiteTargetStrategy');
const TestIdsTargetStrategy = require('./TestIdsTargetStrategy');

// Strategy: chọn cách đổi target_json của template thành danh sách tc_code.
// Strategy: picks how a template's target_json becomes a list of tc_code values.
// Thêm kiểu target mới (vd theo tag) = thêm một file ở đây + một dòng trong `strategies`.
//
// Kết quả cuối: mảng tc_code đã lọc test_status = 'ready', không trùng, sắp xếp ổn định.

const uniqSorted = (codes) =>
  [...new Set(codes)].sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Biểu thức --grep: `(TC-01|TC-02) -`. Giữ ` -` ở cuối để TC-01 không khớp TC-010.
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
      throw new AppError(400, 'VALIDATION_ERROR', 'target_json phải có suiteId hoặc testIds');
    }
    return uniqSorted(await found.strategy.resolve(target));
  };

  return {
    resolve,
    resolveToTestCodes: resolve, // target_json của template
    resolveExplicitTestCodes: (testIds) => resolve({ testIds }), // POST /runs { testIds }
  };
}

module.exports = { createTargetResolver, buildGrep };
