const AppError = require('../utils/AppError');

// Cửa 2: chặn theo vai trò. Dùng requireRole('admin','tester').
// Gate 2: role check. Used as requireRole('admin','tester').
//
// Vai trò hợp lệ: admin / tester / dev / viewer (SRS mục 4). Dev không được chạy test.
// Ẩn nút ở frontend là chưa đủ — mọi hạn chế quyền phải có 403 ở đây.
module.exports = (...roles) => {
  const middleware = (req, res, next) => {
    // Luôn chạy SAU requireAuth; không có req.user là gắn sai thứ tự middleware.
    if (!req.user) {
      return next(new AppError(401, 'UNAUTHORIZED', 'Chưa đăng nhập'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, 'FORBIDDEN', 'Không đủ quyền thực hiện hành động này'));
    }

    next();
  };

  // Để scripts/routes.js in được ma trận quyền từ chính app, không phải từ tài liệu viết tay.
  middleware.roles = roles;
  return middleware;
};
