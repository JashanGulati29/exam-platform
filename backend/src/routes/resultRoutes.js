const router = require('express').Router();
const results = require('../controllers/resultController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);

router.get('/me', requireRole('student'), results.getMyResults);
router.get('/exam/:examId', requireRole('admin', 'examiner'), results.getExamResults);
router.get('/:id', results.getResultDetail);

module.exports = router;
