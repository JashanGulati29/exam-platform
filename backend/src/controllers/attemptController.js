const db = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { ApiError } = require('../middleware/errorHandler');
const { gradeAnswer } = require('../utils/grading');

// Starts a new attempt (or resumes an existing in-progress one, so a
// connection drop / refresh does not lose the student's progress).
const startAttempt = asyncHandler(async (req, res) => {
  const { examId } = req.params;

  const examResult = await db.query('SELECT * FROM exams WHERE id = $1', [examId]);
  const exam = examResult.rows[0];
  if (!exam) throw new ApiError(404, 'Exam not found.');

  const now = new Date();
  if (now < new Date(exam.start_time) || now > new Date(exam.end_time)) {
    throw new ApiError(403, 'This exam is not currently available to take.');
  }

  const enrollment = await db.query(
    'SELECT 1 FROM exam_enrollments WHERE exam_id = $1 AND student_id = $2',
    [examId, req.user.id]
  );
  if (!enrollment.rows.length) throw new ApiError(403, 'You are not enrolled in this exam.');

  const existing = await db.query(
    'SELECT * FROM exam_attempts WHERE exam_id = $1 AND student_id = $2',
    [examId, req.user.id]
  );
  if (existing.rows.length) {
    const attempt = existing.rows[0];
    if (attempt.status !== 'in_progress') {
      throw new ApiError(409, 'You have already submitted this exam.');
    }
    return res.json({ attempt, resumed: true });
  }

  const result = await db.query(
    'INSERT INTO exam_attempts (exam_id, student_id) VALUES ($1,$2) RETURNING *',
    [examId, req.user.id]
  );
  res.status(201).json({ attempt: result.rows[0], resumed: false });
});

// Returns the exam paper with questions but WITHOUT correct answers,
// for the student to actually take the test.
const getAttemptPaper = asyncHandler(async (req, res) => {
  const attemptResult = await db.query(
    'SELECT * FROM exam_attempts WHERE id = $1 AND student_id = $2',
    [req.params.attemptId, req.user.id]
  );
  const attempt = attemptResult.rows[0];
  if (!attempt) throw new ApiError(404, 'Attempt not found.');

  const examResult = await db.query('SELECT * FROM exams WHERE id = $1', [attempt.exam_id]);
  const sectionsResult = await db.query(
    'SELECT * FROM exam_sections WHERE exam_id = $1 ORDER BY order_index',
    [attempt.exam_id]
  );
  const questionsResult = await db.query(
    `SELECT eq.section_id, eq.order_index, q.id, q.type, q.difficulty, q.statement,
            q.options, q.marks, q.starter_code
     FROM exam_questions eq JOIN questions q ON q.id = eq.question_id
     WHERE eq.exam_id = $1 ORDER BY eq.order_index`,
    [attempt.exam_id]
  );
  const answersResult = await db.query(
    'SELECT question_id, response, is_marked_for_review FROM answers WHERE attempt_id = $1',
    [attempt.id]
  );

  res.json({
    attempt,
    exam: examResult.rows[0],
    sections: sectionsResult.rows,
    questions: questionsResult.rows,
    savedAnswers: answersResult.rows,
  });
});

// Auto-saves a single answer (called frequently from the frontend as the
// student works through the paper).
const saveAnswer = asyncHandler(async (req, res) => {
  const { attemptId } = req.params;
  const { questionId, response, isMarkedForReview } = req.body;

  const attemptResult = await db.query(
    'SELECT * FROM exam_attempts WHERE id = $1 AND student_id = $2',
    [attemptId, req.user.id]
  );
  const attempt = attemptResult.rows[0];
  if (!attempt) throw new ApiError(404, 'Attempt not found.');
  if (attempt.status !== 'in_progress') throw new ApiError(409, 'This attempt is no longer active.');

  await db.query(
    `INSERT INTO answers (attempt_id, question_id, response, is_marked_for_review, updated_at)
     VALUES ($1,$2,$3,$4,NOW())
     ON CONFLICT (attempt_id, question_id)
     DO UPDATE SET response = EXCLUDED.response,
                    is_marked_for_review = EXCLUDED.is_marked_for_review,
                    updated_at = NOW()`,
    [attemptId, questionId, JSON.stringify(response), Boolean(isMarkedForReview)]
  );
  await db.query('UPDATE exam_attempts SET last_heartbeat = NOW() WHERE id = $1', [attemptId]);

  res.json({ message: 'Saved.' });
});

// Lightweight heartbeat the client pings periodically; also used to detect
// students who disconnected without submitting (for proctoring alerts).
const heartbeat = asyncHandler(async (req, res) => {
  await db.query('UPDATE exam_attempts SET last_heartbeat = NOW() WHERE id = $1 AND student_id = $2', [
    req.params.attemptId,
    req.user.id,
  ]);
  res.json({ message: 'ok' });
});

const submitAttempt = asyncHandler(async (req, res) => {
  const { attemptId } = req.params;
  const { autoSubmitted } = req.body;

  const attemptResult = await db.query(
    'SELECT * FROM exam_attempts WHERE id = $1 AND student_id = $2',
    [attemptId, req.user.id]
  );
  const attempt = attemptResult.rows[0];
  if (!attempt) throw new ApiError(404, 'Attempt not found.');
  if (attempt.status !== 'in_progress') {
    return res.json({ message: 'Already submitted.', attempt });
  }

  await gradeAndStoreResult(attemptId);

  const newStatus = autoSubmitted ? 'auto_submitted' : 'submitted';
  const updated = await db.query(
    `UPDATE exam_attempts SET status = $1, submitted_at = NOW() WHERE id = $2 RETURNING *`,
    [newStatus, attemptId]
  );

  res.json({ message: 'Exam submitted.', attempt: updated.rows[0] });
});

// Auto-grades every objective answer in the attempt and writes a row to
// `results`. Subjective (short_answer) questions are left for an examiner
// to mark manually via the evaluation endpoint; the result is finalized
// (and rank recalculated) once all answers have marks_awarded set.
async function gradeAndStoreResult(attemptId) {
  const attemptResult = await db.query('SELECT * FROM exam_attempts WHERE id = $1', [attemptId]);
  const attempt = attemptResult.rows[0];

  const answersResult = await db.query(
    `SELECT a.*, q.type, q.marks, q.negative_marks, q.correct_answer
     FROM answers a JOIN questions q ON q.id = a.question_id
     WHERE a.attempt_id = $1`,
    [attemptId]
  );

  let totalScore = 0;
  let maxScore = 0;
  let correctCount = 0;
  let gradedCount = 0;

  for (const row of answersResult.rows) {
    maxScore += Number(row.marks);
    const grading = gradeAnswer(row, row.response);
    if (!grading.requiresManualReview) {
      totalScore += Number(grading.marksAwarded || 0);
      gradedCount += 1;
      if (grading.isCorrect) correctCount += 1;
      await db.query(
        'UPDATE answers SET is_correct = $1, marks_awarded = $2 WHERE id = $3',
        [grading.isCorrect, grading.marksAwarded, row.id]
      );
    }
  }

  const accuracy = gradedCount > 0 ? Number(((correctCount / gradedCount) * 100).toFixed(2)) : null;
  const examResult = await db.query('SELECT passing_marks FROM exams WHERE id = $1', [attempt.exam_id]);
  const isPass = totalScore >= Number(examResult.rows[0]?.passing_marks || 0);

  await db.query(
    `INSERT INTO results (attempt_id, exam_id, student_id, total_score, max_score, accuracy, is_pass)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (attempt_id) DO UPDATE SET
       total_score = EXCLUDED.total_score, max_score = EXCLUDED.max_score,
       accuracy = EXCLUDED.accuracy, is_pass = EXCLUDED.is_pass`,
    [attemptId, attempt.exam_id, attempt.student_id, totalScore, maxScore, accuracy, isPass]
  );

  await recalculateRanks(attempt.exam_id);
}

async function recalculateRanks(examId) {
  await db.query(
    `WITH ranked AS (
       SELECT id, RANK() OVER (ORDER BY total_score DESC) AS rnk
       FROM results WHERE exam_id = $1
     )
     UPDATE results r SET rank = ranked.rnk FROM ranked WHERE r.id = ranked.id`,
    [examId]
  );
}

// Examiner manually grades a short-answer (or overrides any) response.
const gradeAnswerManually = asyncHandler(async (req, res) => {
  const { answerId } = req.params;
  const { marksAwarded, feedback, isCorrect } = req.body;
  if (marksAwarded === undefined) throw new ApiError(400, 'marksAwarded is required.');

  const result = await db.query(
    `UPDATE answers SET marks_awarded = $1, examiner_feedback = $2, is_correct = $3, evaluated_by = $4
     WHERE id = $5 RETURNING *`,
    [marksAwarded, feedback || null, isCorrect ?? null, req.user.id, answerId]
  );
  if (!result.rows.length) throw new ApiError(404, 'Answer not found.');

  const answer = result.rows[0];
  // Re-aggregate the result total now that a manual mark has been added.
  const totals = await db.query(
    'SELECT COALESCE(SUM(marks_awarded),0) AS total FROM answers WHERE attempt_id = $1',
    [answer.attempt_id]
  );
  const attempt = await db.query('SELECT * FROM exam_attempts WHERE id = $1', [answer.attempt_id]);
  const exam = await db.query('SELECT passing_marks FROM exams WHERE id = $1', [attempt.rows[0].exam_id]);
  const isPass = Number(totals.rows[0].total) >= Number(exam.rows[0]?.passing_marks || 0);

  await db.query(
    `UPDATE results SET total_score = $1, is_pass = $2 WHERE attempt_id = $3`,
    [totals.rows[0].total, isPass, answer.attempt_id]
  );
  await recalculateRanks(attempt.rows[0].exam_id);

  res.json({ answer });
});

const getPendingEvaluations = asyncHandler(async (req, res) => {
  const result = await db.query(
    `SELECT a.id AS answer_id, a.response, q.statement, q.type, q.marks, q.test_cases,
            ea.id AS attempt_id, u.full_name AS student_name, e.title AS exam_title
     FROM answers a
     JOIN questions q ON q.id = a.question_id
     JOIN exam_attempts ea ON ea.id = a.attempt_id
     JOIN users u ON u.id = ea.student_id
     JOIN exams e ON e.id = ea.exam_id
     WHERE q.type = 'short_answer' AND a.marks_awarded IS NULL AND ea.status != 'in_progress'
       AND e.created_by = $1
     ORDER BY ea.submitted_at ASC`,
    [req.user.id]
  );
  res.json({ pending: result.rows });
});

// Used by the auto-submit background job in server.js to grade + close out
// attempts whose exam window has ended while they were still in progress.
async function autoSubmitAttempt(attemptId) {
  await gradeAndStoreResult(attemptId);
  await db.query(
    `UPDATE exam_attempts SET status = 'auto_submitted', submitted_at = NOW() WHERE id = $1`,
    [attemptId]
  );
}

module.exports = {
  startAttempt,
  getAttemptPaper,
  saveAnswer,
  heartbeat,
  submitAttempt,
  gradeAnswerManually,
  getPendingEvaluations,
  autoSubmitAttempt,
};
