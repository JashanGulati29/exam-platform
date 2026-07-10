const db = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

const listNotifications = asyncHandler(async (req, res) => {
  const result = await db.query(
    'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
    [req.user.id]
  );
  res.json({ notifications: result.rows });
});

const markAsRead = asyncHandler(async (req, res) => {
  await db.query('UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2', [
    req.params.id,
    req.user.id,
  ]);
  res.json({ message: 'Marked as read.' });
});

const markAllAsRead = asyncHandler(async (req, res) => {
  await db.query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE', [req.user.id]);
  res.json({ message: 'All notifications marked as read.' });
});

// Internal helper (used by other controllers / scheduled jobs) to create a
// notification row; not exposed directly as a route.
async function createNotification({ userId, type, title, message }) {
  await db.query(
    'INSERT INTO notifications (user_id, type, title, message) VALUES ($1,$2,$3,$4)',
    [userId, type, title, message]
  );
}

module.exports = { listNotifications, markAsRead, markAllAsRead, createNotification };
