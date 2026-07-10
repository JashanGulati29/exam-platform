const db = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Express-compatible middleware that records an audit log entry after the
 * handler has successfully responded. Call it last in the handler chain, or
 * use the standalone `logAuditEvent` helper from other controllers.
 *
 *   router.post('/exams', requireAuth, requireRole('admin','examiner'), audit('CREATE_EXAM', 'exam'), createExam);
 */
function audit(action, entity) {
  return asyncHandler(async (req, res, next) => {
    try {
      await db.query(
        `INSERT INTO audit_logs (user_id, action, entity, entity_id, metadata)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          req.user?.id || null,
          action,
          entity || null,
          null,
          JSON.stringify({ path: req.path, method: req.method, body: req.body }),
        ]
      );
    } catch {
      // Audit failures are silent — never block the real request.
    }
    next();
  });
}

/**
 * Programmatic helper for recording events from inside controller functions.
 * Errors are swallowed so audit failures never surface as 500s.
 */
async function logAuditEvent({ userId, action, entity, entityId, metadata } = {}) {
  try {
    await db.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId || null, action, entity || null, entityId || null, metadata ? JSON.stringify(metadata) : null]
    );
  } catch {
    // silent
  }
}

const listAuditLogs = asyncHandler(async (req, res) => {
  const { page = 1, pageSize = 30 } = req.query;
  const limit = Math.min(Number(pageSize) || 30, 100);
  const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;

  const result = await db.query(
    `SELECT al.*, u.full_name, u.email
     FROM audit_logs al LEFT JOIN users u ON u.id = al.user_id
     ORDER BY al.created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  const count = await db.query('SELECT COUNT(*)::int AS total FROM audit_logs');
  res.json({ logs: result.rows, total: count.rows[0].total, page: Number(page), pageSize: limit });
});

module.exports = { audit, logAuditEvent, listAuditLogs };
