const router = require('express').Router();
const questions = require('../controllers/questionController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth, requireRole('admin', 'examiner'));

router.get('/categories', questions.listCategories);
router.post('/categories', questions.createCategory);

router.get('/', questions.listQuestions);
router.post('/', questions.createQuestion);
router.post('/bulk-import', questions.bulkImport);
router.get('/:id', questions.getQuestion);
router.patch('/:id', questions.updateQuestion);
router.delete('/:id', questions.deleteQuestion);

module.exports = router;
