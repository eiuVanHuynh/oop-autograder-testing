const AppError = require('../utils/AppError');

// Gate 2: block by role. Use requireRole('admin','tester').
//
// Valid roles: admin / tester / dev / viewer (SRS section 4). Dev may not run tests.
// Hiding a button in the frontend is not enough — every permission limit needs a 403 here.
module.exports = (...roles) => {
  const middleware = (req, res, next) => {
    // Always runs AFTER requireAuth; a missing req.user means the middleware order is wrong.
    if (!req.user) {
      return next(new AppError(401, 'UNAUTHORIZED', 'Not authenticated'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, 'FORBIDDEN', 'Insufficient permissions for this action'));
    }

    next();
  };

  // Lets scripts/routes.js print the permission matrix from the app itself, not from hand-written docs.
  middleware.roles = roles;
  return middleware;
};
