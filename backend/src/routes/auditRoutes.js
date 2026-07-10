const router = require('express').Router();
const { listAuditLogs } = require('../controllers/auditController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.get('/', requireAuth, requireRole('admin'), listAuditLogs);

module.exports = router;
