const router = require('express').Router();
const metaController = require('../controllers/meta.controller');
const requireAuth = require('../middlewares/requireAuth');

// The options available to the UI (api-endpoints.md section 12).
// A route only declares the URL, it holds no logic.

// GET /api/meta/options – environments, priority, test_type, test_status… (any signed-in user)
router.get('/options', requireAuth, metaController.getOptions);

module.exports = router;
