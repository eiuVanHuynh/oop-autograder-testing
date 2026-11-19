const router = require('express').Router();
const bugsController = require('../controllers/bugs.controller');
const requireAuth = require('../middlewares/requireAuth');
const requireRole = require('../middlewares/requireRole');
const validate = require('../middlewares/validate');
const {
  createBugSchema,
  updateBugSchema,
  bugQuerySchema,
  idParamsSchema,
} = require('../validators/bugs.schema');

// Report a bug from a failed test result (🟡).
// Full endpoint list: api-endpoints.md section 10. POST /results/:id/bugs does NOT sit under /bugs,
// so this group is mounted at the root and declares full paths (see the note in routes/index.js).
//
// Every line in this order: requireAuth → requireRole → validate → controller.
const canReport = requireRole('admin', 'tester', 'dev'); // Appendix A: Dev may report bugs
const validateId = validate(idParamsSchema, 'params');

// POST /api/results/:id/bugs – create a bug report from a failed result (409 if the result passed)
router.post('/results/:id/bugs', requireAuth, canReport, validateId, validate(createBugSchema), bugsController.createBug);

// GET /api/bugs?status=&severity= – bug list (any signed-in user)
router.get('/bugs', requireAuth, validate(bugQuerySchema, 'query'), bugsController.getBugs);

// PATCH /api/bugs/:id – update a bug, usually its status (Admin, Tester)
router.patch('/bugs/:id', requireAuth, requireRole('admin', 'tester'), validateId, validate(updateBugSchema), bugsController.updateBug);

module.exports = router;
