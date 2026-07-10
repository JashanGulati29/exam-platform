const db = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

// ---------- Admin ----------
const adminOverview = asyncHandler(async (req, res) => {
  const [exams, students, activeExams, completionRate, proctoringAlerts] = await Promise.all([
    db.query('SELECT COUNT(*)::int AS count FROM exams'),
    db.query(`SELECT COUNT(*)::int AS count FROM users WHERE role = 'student'`),
    db.query(`SELECT COUNT(*)::int AS count FROM exams WHERE status = 'live'`),
    db.query(`
      SELECT
        COALESCE(ROUND(100.0 * COUNT(*) FILTER (WHERE status IN ('submitted','auto_submitted','evaluated')) / NULLIF(COUNT(*),0), 1), 0) AS rate
      FROM exam_attempts
    `),
    db.query(`SELECT COUNT(*)::int AS count FROM proctoring_logs WHERE occurred_at > NOW() - INTERVAL '24 hours'`),
  ]);

  res.json({
    totalExams: exams.rows[0].count,
    totalStudents: students.rows[0].count,
    activeExams: activeExams.rows[0].count,
    completionRate: Number(completionRate.rows[0].rate),
    proctoringAlertsLast24h: proctoringAlerts.rows[0].count,
  });
});

const adminPassFailRate = asyncHandler(async (req, res) => {
  const result = await db.query(`
    SELECT e.title, 
           COUNT(*) FILTER (WHERE r.is_pass = TRUE)::int AS passed,
           COUNT(*) FILTER (WHERE r.is_pass = FALSE)::int AS failed
    FROM results r JOIN exams e ON e.id = r.exam_id
    GROUP BY e.id, e.title ORDER BY e.title
  `);
  res.json({ data: result.rows });
});

const adminTopPerformers = asyncHandler(async (req, res) => {
  const result = await db.query(`
    SELECT u.full_name, e.title AS exam_title, r.total_score, r.max_score, r.rank
    FROM results r
    JOIN users u ON u.id = r.student_id
    JOIN exams e ON e.id = r.exam_id
    WHERE r.rank IS NOT NULL
    ORDER BY (r.total_score / NULLIF(r.max_score,0)) DESC
    LIMIT 10
  `);
  res.json({ data: result.rows });
});

const adminQuestionDifficultyAnalysis = asyncHandler(async (req, res) => {
  const result = await db.query(`
    SELECT q.difficulty,
           COUNT(a.id)::int AS attempts,
           COALESCE(ROUND(100.0 * COUNT(*) FILTER (WHERE a.is_correct = TRUE) / NULLIF(COUNT(*),0), 1), 0) AS correct_rate
    FROM answers a JOIN questions q ON q.id = a.question_id
    GROUP BY q.difficulty ORDER BY q.difficulty
  `);
  res.json({ data: result.rows });
});

const adminProctoringReport = asyncHandler(async (req, res) => {
  const result = await db.query(`
    SELECT event_type, severity, COUNT(*)::int AS count
    FROM proctoring_logs GROUP BY event_type, severity ORDER BY count DESC
  `);
  res.json({ data: result.rows });
});

// ---------- Student ----------
const studentOverview = asyncHandler(async (req, res) => {
  const studentId = req.user.id;
  const [upcoming, completed, scores] = await Promise.all([
    db.query(
      `SELECT COUNT(*)::int AS count FROM exam_enrollments en JOIN exams e ON e.id = en.exam_id
       WHERE en.student_id = $1 AND e.start_time > NOW()`,
      [studentId]
    ),
    db.query(
      `SELECT COUNT(*)::int AS count FROM exam_attempts WHERE student_id = $1 AND status != 'in_progress'`,
      [studentId]
    ),
    db.query(
      `SELECT COALESCE(ROUND(AVG(100.0 * total_score / NULLIF(max_score,0)), 1), 0) AS avg_percentage
       FROM results WHERE student_id = $1`,
      [studentId]
    ),
  ]);

  res.json({
    upcomingExams: upcoming.rows[0].count,
    completedExams: completed.rows[0].count,
    averageScorePercent: Number(scores.rows[0].avg_percentage),
  });
});

const studentPerformanceTrend = asyncHandler(async (req, res) => {
  const result = await db.query(
    `SELECT e.title, r.generated_at, r.total_score, r.max_score,
            ROUND(100.0 * r.total_score / NULLIF(r.max_score,0), 1) AS percentage
     FROM results r JOIN exams e ON e.id = r.exam_id
     WHERE r.student_id = $1 ORDER BY r.generated_at ASC`,
    [req.user.id]
  );
  res.json({ data: result.rows });
});

// ---------- Examiner ----------
const examinerOverview = asyncHandler(async (req, res) => {
  const examinerId = req.user.id;
  const [questions, examsConducted, pendingEvals] = await Promise.all([
    db.query(`SELECT COUNT(*)::int AS count FROM questions WHERE created_by = $1`, [examinerId]),
    db.query(`SELECT COUNT(*)::int AS count FROM exams WHERE created_by = $1`, [examinerId]),
    db.query(
      `SELECT COUNT(*)::int AS count FROM answers a
       JOIN questions q ON q.id = a.question_id
       JOIN exam_attempts ea ON ea.id = a.attempt_id
       JOIN exams e ON e.id = ea.exam_id
       WHERE q.type = 'short_answer' AND a.marks_awarded IS NULL
         AND ea.status != 'in_progress' AND e.created_by = $1`,
      [examinerId]
    ),
  ]);

  res.json({
    questionsCreated: questions.rows[0].count,
    examsConducted: examsConducted.rows[0].count,
    pendingEvaluations: pendingEvals.rows[0].count,
  });
});

module.exports = {
  adminOverview,
  adminPassFailRate,
  adminTopPerformers,
  adminQuestionDifficultyAnalysis,
  adminProctoringReport,
  studentOverview,
  studentPerformanceTrend,
  examinerOverview,
};
