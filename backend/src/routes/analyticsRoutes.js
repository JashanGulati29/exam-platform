const router = require('express').Router();
const analytics = require('../controllers/analyticsController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);

router.get('/admin/overview', requireRole('admin'), analytics.adminOverview);
router.get('/admin/pass-fail', requireRole('admin'), analytics.adminPassFailRate);
router.get('/admin/top-performers', requireRole('admin'), analytics.adminTopPerformers);
router.get('/admin/question-difficulty', requireRole('admin'), analytics.adminQuestionDifficultyAnalysis);
router.get('/admin/proctoring-report', requireRole('admin'), analytics.adminProctoringReport);

router.get('/student/overview', requireRole('student'), analytics.studentOverview);
router.get('/student/performance-trend', requireRole('student'), analytics.studentPerformanceTrend);

router.get('/examiner/overview', requireRole('examiner'), analytics.examinerOverview);

module.exports = router;
