const router = require('express').Router();
const notifications = require('../controllers/notificationController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', notifications.listNotifications);
router.patch('/:id/read', notifications.markAsRead);
router.patch('/read-all', notifications.markAllAsRead);

module.exports = router;
