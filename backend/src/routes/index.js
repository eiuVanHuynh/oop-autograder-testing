const router = require('express').Router();

// The one place endpoint groups are mounted under /api: one line per group that EXISTS, so this file
// answers "what does the API actually serve" without opening ten files.
//
// Not mounted, because nothing is written yet (api-endpoints.md sections 3 and 7): /stats (dashboard
// metrics — the UI computes them from /runs for now) and /reports (export + share links — the UI builds
// its own HTML). Their empty controller/service/validator/route placeholders were deleted rather than
// left behind: an empty file that is mounted answers 404 exactly like one that does not exist, and the
// spec in api-endpoints.md is the real to-do list.
//
// Note: some URLs do not sit under the prefix named after their group
// (e.g. POST /results/:id/bugs belongs to bugs, GET /share/:token belongs to reports)
// – declare the full path directly in that group's routes file.

router.use('/auth', require('./auth.routes'));
router.use('/users', require('./users.routes'));
router.use('/templates', require('./templates.routes'));
router.use('/runs', require('./runs.routes'));
router.use('/ingest', require('./ingest.routes'));
router.use('/catalog', require('./catalog.routes')); //Manages test suites, test cases and catalog data
// bugs.routes also declares POST /results/:id/bugs, so it is mounted at the root too.
router.use('/', require('./bugs.routes'));
// system.routes declares the public URL GET /health (api-endpoints.md section 11), so it is mounted at the root,
// not under /system — see the note at the top of this file.
router.use('/', require('./system.routes'));
router.use('/meta', require('./meta.routes'));

module.exports = router;
