const AppError = require('../utils/AppError');

// Cửa 3: kiểm dữ liệu vào bằng zod trước khi tới controller.
// Gate 3: validate the incoming data with zod before the controller runs.
//
// Schema để ở validators/, không viết thẳng trong route.
// Schemas live in validators/, never inline in a route.
module.exports = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);

  if (!result.success) {
    return next(
      new AppError(
        400,
        'VALIDATION_ERROR',
        'Dữ liệu gửi lên không hợp lệ',
        result.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      ),
    );
  }

  // Gán lại bản đã parse để controller dùng dữ liệu đã ép kiểu và đã có .default() của zod.
  // shortcut: gán req.query chỉ chạy trên Express 4 (dự án đang dùng 4.21); Express 5 biến
  // nó thành getter chỉ-đọc — khi nâng version phải chuyển sang req.validated.
  req[source] = result.data;
  next();
};
