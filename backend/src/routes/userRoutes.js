const router = require('express').Router();
const users = require('../controllers/userController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth, requireRole('admin'));

router.get('/', users.listUsers);
router.post('/', users.createUser);
router.patch('/:id', users.updateUser);
router.delete('/:id', users.deleteUser);

module.exports = router;
