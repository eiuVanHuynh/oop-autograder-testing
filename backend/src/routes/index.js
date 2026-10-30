const router = require('express').Router();

// Nơi duy nhất gắn các nhóm endpoint vào /api. Đã khai đủ 10 nhóm theo api-endpoints.md,
// The only place endpoint groups are mounted under /api. All 10 groups from api-endpoints.md
// nên khi làm một nhóm thì chỉ sửa file routes/<nhóm>.routes.js, không đụng file này.
// are already declared, so working on a group means editing routes/<group>.routes.js only.
//
// Lưu ý / Note: một số URL không nằm dưới tiền tố cùng tên nhóm
// (ví dụ POST /results/:id/bugs thuộc nhóm bugs, GET /share/:token thuộc nhóm reports)
// – khai báo thẳng đường dẫn đầy đủ trong file routes của nhóm đó.

router.use('/auth', require('./auth.routes'));
router.use('/users', require('./users.routes'));
router.use('/stats', require('./stats.routes'));
router.use('/templates', require('./templates.routes'));
router.use('/runs', require('./runs.routes'));
router.use('/reports', require('./reports.routes'));
router.use('/ingest', require('./ingest.routes'));
router.use('/catalog', require('./catalog.routes'));
// bugs.routes khai cả POST /results/:id/bugs nên cũng mount ở gốc.
router.use('/', require('./bugs.routes'));
// system.routes khai URL công khai GET /health (api-endpoints.md mục 11) nên mount ở gốc,
// không dưới /system — xem ghi chú ở đầu file.
router.use('/', require('./system.routes'));
router.use('/meta', require('./meta.routes'));

module.exports = router;
