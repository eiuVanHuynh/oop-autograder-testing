const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');
const { userRepository } = require('../config/container');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

// Gate 1 of the chain: verify the JWT, then attach req.user = { user_id, role }.
module.exports = asyncHandler(async (req, res, next) => {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new AppError(401, 'UNAUTHORIZED', 'Missing Authorization: Bearer <token> header');
  }

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    throw new AppError(401, 'UNAUTHORIZED', 'Token is invalid or expired');
  }

  // The DB must be read: a token issued before an admin locked the account still has a valid signature.
  const user = await userRepository.findById(payload.user_id);
  if (!user) {
    throw new AppError(401, 'UNAUTHORIZED', 'Account no longer exists');
  }
  if (user.user_status !== 'active') {
    throw new AppError(423, 'ACCOUNT_LOCKED', 'Account is locked');
  }

  // Attach only id and role, never the whole user record.
  req.user = { user_id: user.user_id, role: user.user_role };
  next();
});
