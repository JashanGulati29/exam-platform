const router = require('express').Router();
const attempts = require('../controllers/attemptController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);

router.post('/exams/:examId/start', requireRole('student'), attempts.startAttempt);
router.get('/:attemptId/paper', requireRole('student'), attempts.getAttemptPaper);
router.put('/:attemptId/answers', requireRole('student'), attempts.saveAnswer);
router.post('/:attemptId/heartbeat', requireRole('student'), attempts.heartbeat);
router.post('/:attemptId/submit', requireRole('student'), attempts.submitAttempt);

router.get('/evaluations/pending', requireRole('examiner', 'admin'), attempts.getPendingEvaluations);
router.post('/answers/:answerId/grade', requireRole('examiner', 'admin'), attempts.gradeAnswerManually);

module.exports = router;
