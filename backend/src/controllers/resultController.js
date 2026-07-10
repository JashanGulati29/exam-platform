const db = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { ApiError } = require('../middleware/errorHandler');

const getMyResults = asyncHandler(async (req, res) => {
  const result = await db.query(
    `SELECT r.*, e.title AS exam_title FROM results r
     JOIN exams e ON e.id = r.exam_id
     WHERE r.student_id = $1 ORDER BY r.generated_at DESC`,
    [req.user.id]
  );
  res.json({ results: result.rows });
});

const getResultDetail = asyncHandler(async (req, res) => {
  const resultRow = await db.query(
    `SELECT r.*, e.title AS exam_title FROM results r JOIN exams e ON e.id = r.exam_id WHERE r.id = $1`,
    [req.params.id]
  );
  if (!resultRow.rows.length) throw new ApiError(404, 'Result not found.');

  const result = resultRow.rows[0];
  if (req.user.role === 'student' && result.student_id !== req.user.id) {
    throw new ApiError(403, 'You cannot view another student\u2019s result.');
  }

  const answers = await db.query(
    `SELECT a.*, q.statement, q.type, q.marks AS max_marks
     FROM answers a JOIN questions q ON q.id = a.question_id
     WHERE a.attempt_id = $1`,
    [result.attempt_id]
  );

  res.json({ result, answers: answers.rows });
});

const getExamResults = asyncHandler(async (req, res) => {
  const result = await db.query(
    `SELECT r.*, u.full_name AS student_name FROM results r
     JOIN users u ON u.id = r.student_id
     WHERE r.exam_id = $1 ORDER BY r.rank ASC NULLS LAST`,
    [req.params.examId]
  );
  res.json({ results: result.rows });
});

module.exports = { getMyResults, getResultDetail, getExamResults };
