const AppError = require('../utils/AppError');

// Gate 3: validate incoming data with zod before it reaches the controller.
//
// Schemas live in validators/, never inline in the route.
module.exports = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);

  if (!result.success) {
    return next(
      new AppError(
        400,
        'VALIDATION_ERROR',
        'Invalid request data',
        result.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      ),
    );
  }

  // Reassign the parsed value so the controller gets coerced data and zod's .default() values.
  // shortcut: assigning req.query only works on Express 4 (project is on 4.21); Express 5 turns
  // it into a read-only getter — on upgrade, switch to req.validated.
  req[source] = result.data;
  next();
};
