const router = require('express').Router();
const exams = require('../controllers/examController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', exams.listExams);
router.get('/:id', exams.getExam);

router.post('/', requireRole('admin', 'examiner'), exams.createExam);
router.patch('/:id', requireRole('admin', 'examiner'), exams.updateExam);
router.delete('/:id', requireRole('admin'), exams.deleteExam);
router.post('/:id/enroll', requireRole('admin', 'examiner'), exams.enrollStudents);

module.exports = router;
