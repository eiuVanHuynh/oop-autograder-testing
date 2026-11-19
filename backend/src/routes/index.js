const router = require('express').Router();

// The one place endpoint groups are mounted under /api. All 10 groups from api-endpoints.md
// are already declared, so working on a group means editing routes/<group>.routes.js only, not this file.
//
// Note: some URLs do not sit under the prefix named after their group
// (e.g. POST /results/:id/bugs belongs to bugs, GET /share/:token belongs to reports)
// – declare the full path directly in that group's routes file.

router.use('/auth', require('./auth.routes'));
router.use('/users', require('./users.routes'));
router.use('/stats', require('./stats.routes'));
router.use('/templates', require('./templates.routes'));
router.use('/runs', require('./runs.routes'));
router.use('/reports', require('./reports.routes'));
router.use('/ingest', require('./ingest.routes'));
router.use('/catalog', require('./catalog.routes')); //Manages test suites, test cases and catalog data
// bugs.routes also declares POST /results/:id/bugs, so it is mounted at the root too.
router.use('/', require('./bugs.routes'));
// system.routes declares the public URL GET /health (api-endpoints.md section 11), so it is mounted at the root,
// not under /system — see the note at the top of this file.
router.use('/', require('./system.routes'));
router.use('/meta', require('./meta.routes'));

module.exports = router;
