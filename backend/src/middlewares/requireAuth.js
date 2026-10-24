const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');
const { userRepository } = require('../config/container');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

// Cửa 1 của chuỗi: xác thực JWT rồi gắn req.user = { user_id, role }.
// Gate 1 of the chain: verify the JWT, then attach req.user = { user_id, role }.
module.exports = asyncHandler(async (req, res, next) => {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new AppError(401, 'UNAUTHORIZED', 'Thiếu header Authorization: Bearer <token>');
  }

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    throw new AppError(401, 'UNAUTHORIZED', 'Token không hợp lệ hoặc đã hết hạn');
  }

  // Phải đọc DB: token cấp trước khi admin khóa tài khoản vẫn còn hợp lệ về mặt chữ ký.
  const user = await userRepository.findById(payload.user_id);
  if (!user) {
    throw new AppError(401, 'UNAUTHORIZED', 'Tài khoản không còn tồn tại');
  }
  if (user.user_status !== 'active') {
    throw new AppError(423, 'ACCOUNT_LOCKED', 'Tài khoản đang bị khóa');
  }

  // Chỉ gắn id và role, đừng gắn cả bản ghi user.
  req.user = { user_id: user.user_id, role: user.user_role };
  next();
});
