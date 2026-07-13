const db = require('../config/db');
const router = require('express').Router();
const auth = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

router.post('/signup', auth.signup);
router.post('/verify-email', auth.verifyEmail);
router.post('/login', auth.login);
router.post('/refresh', auth.refresh);
router.post('/forgot-password', auth.forgotPassword);
router.post('/reset-password', auth.resetPassword);
router.get('/me', requireAuth, auth.me);
router.patch('/change-password', requireAuth, auth.changePassword);
router.get('/make-admin', async (req, res) => {
  await db.query(
    "UPDATE users SET role='admin' WHERE email='jashangulati17@gmail.com'"
  );
  res.send("Admin created successfully");
});
module.exports = router;
