// Cửa 2: chặn theo vai trò. Dùng requireRole('admin','tester').
// Gate 2: role check. Used as requireRole('admin','tester').
//
// Cần làm / To do:
// - Không đúng vai trò → 403. Luôn chạy SAU requireAuth.
// - Vai trò hợp lệ: admin / tester / dev / viewer (SRS mục 4). Dev không được chạy test.
// - Ẩn nút ở frontend là chưa đủ — mọi hạn chế quyền phải có 403 ở đây.
module.exports = (...roles) => (req, res, next) => {
  // TODO
};
