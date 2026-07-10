const router = require('express').Router();
const proctoring = require('../controllers/proctoringController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);

router.post('/attempts/:attemptId/events', requireRole('student'), proctoring.logEvent);
router.get('/attempts/:attemptId/events', requireRole('admin', 'examiner'), proctoring.getAttemptLogs);
router.get('/exams/:examId/live', requireRole('admin', 'examiner'), proctoring.getLiveOverview);

module.exports = router;
