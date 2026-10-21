// Strategy: chọn cách đổi target_json của template thành danh sách tc_code.
// Strategy: picks how a template's target_json becomes a list of tc_code values.
// Thêm kiểu target mới (vd theo tag) = thêm một file ở đây, không sửa runs.service.
// A new target kind (e.g. by tag) means one new file here, not an edit to runs.service.
//
// Cần làm / To do:
// - resolve(target, deps): target có suiteId → SuiteTargetStrategy; có testIds → TestIdsTargetStrategy.
// - Không khớp kiểu nào → ném AppError 400.
// - Kết quả cuối: mảng tc_code đã lọc test_status = 'ready', sắp xếp ổn định.
// - Ghép grep ở đây luôn: `(TC-01|TC-02) -`, giữ ` -` ở cuối để TC-01 không khớp TC-010.

// TODO
module.exports = {};
