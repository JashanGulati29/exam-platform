const db = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { ApiError } = require('../middleware/errorHandler');

const SEVERITY_BY_EVENT = {
  no_face: 'medium',
  multiple_faces: 'high',
  tab_switch: 'medium',
  window_blur: 'low',
  fullscreen_exit: 'medium',
  copy_paste: 'low',
  connection_lost: 'low',
  face_mismatch: 'high',
};

// Called by the student's browser whenever the proctoring client (face
// detection / tab-visibility / fullscreen listeners) observes a violation.
// Also broadcasts the event over Socket.io so a live admin dashboard
// updates in real time (see sockets/proctoringSocket.js).
const logEvent = asyncHandler(async (req, res) => {
  const { attemptId } = req.params;
  const { eventType, snapshotUrl, metadata } = req.body;
  if (!eventType) throw new ApiError(400, 'eventType is required.');

  const attemptResult = await db.query(
    'SELECT * FROM exam_attempts WHERE id = $1 AND student_id = $2',
    [attemptId, req.user.id]
  );
  const attempt = attemptResult.rows[0];
  if (!attempt) throw new ApiError(404, 'Attempt not found.');

  const severity = SEVERITY_BY_EVENT[eventType] || 'low';
  const result = await db.query(
    `INSERT INTO proctoring_logs (attempt_id, event_type, severity, snapshot_url, metadata)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [attemptId, eventType, severity, snapshotUrl || null, metadata ? JSON.stringify(metadata) : null]
  );

  if (eventType === 'tab_switch') {
    await db.query('UPDATE exam_attempts SET tab_switch_count = tab_switch_count + 1 WHERE id = $1', [attemptId]);
  }

  const io = req.app.get('io');
  if (io) {
    io.to(`exam:${attempt.exam_id}:proctors`).emit('proctoring:event', {
      attemptId,
      examId: attempt.exam_id,
      studentId: attempt.student_id,
      ...result.rows[0],
    });
  }

  res.status(201).json({ log: result.rows[0] });
});

const getAttemptLogs = asyncHandler(async (req, res) => {
  const result = await db.query(
    'SELECT * FROM proctoring_logs WHERE attempt_id = $1 ORDER BY occurred_at DESC',
    [req.params.attemptId]
  );
  res.json({ logs: result.rows });
});

// Snapshot of every currently in-progress attempt for a given exam, with
// a rolled-up violation count — what the "Live Proctor Dashboard" polls
// or receives over the socket connection.
const getLiveOverview = asyncHandler(async (req, res) => {
  const { examId } = req.params;
  const result = await db.query(
    `SELECT a.id AS attempt_id, a.student_id, u.full_name AS student_name, a.started_at,
            a.last_heartbeat, a.tab_switch_count,
            (SELECT COUNT(*) FROM proctoring_logs pl WHERE pl.attempt_id = a.id)::int AS violation_count,
            (SELECT MAX(severity::text) FROM proctoring_logs pl WHERE pl.attempt_id = a.id) AS max_severity
     FROM exam_attempts a JOIN users u ON u.id = a.student_id
     WHERE a.exam_id = $1 AND a.status = 'in_progress'
     ORDER BY violation_count DESC`,
    [examId]
  );
  res.json({ liveAttempts: result.rows });
});

module.exports = { logEvent, getAttemptLogs, getLiveOverview };
