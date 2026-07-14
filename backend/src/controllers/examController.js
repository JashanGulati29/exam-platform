const db = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { ApiError } = require('../middleware/errorHandler');
function generateExamCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}
// Creates an exam together with its sections, questions and (optionally)
// the list of enrolled students, all inside a single transaction.
const createExam = asyncHandler(async (req, res) => {
  const e = req.body;
  if (!e.title || !e.durationMinutes || !e.startTime || !e.endTime) {
    throw new ApiError(400, 'title, durationMinutes, startTime and endTime are required.');
  }

  const client = await db.getClient();
  try {
  await client.query('BEGIN');

const examCode = generateExamCode();

const examResult = await client.query(
  `INSERT INTO exams
    (
      title,
      exam_code,
      description,
      created_by,
      duration_minutes,
      start_time,
      end_time,
      negative_marking,
      randomize_questions,
      fullscreen_required,
      proctoring_enabled,
      max_tab_switches,
      instructions,
      status
    )
    VALUES
    (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14
    )
    RETURNING *`,
  [
    e.title,
    examCode,
    e.description || null,
    req.user.id,
    e.durationMinutes,
    e.startTime,
    e.endTime,
    e.negativeMarking ?? false,
    e.randomizeQuestions ?? false,
    e.fullscreenRequired ?? true,
    e.proctoringEnabled ?? true,
    e.maxTabSwitches ?? 3,
    e.instructions || null,
    e.status || "draft",
  ]
);

const exam = examResult.rows[0];
    let totalMarks = 0;

    // sections: [{ title, questionIds: [...] }]
    if (Array.isArray(e.sections)) {
      for (let s = 0; s < e.sections.length; s += 1) {
        const section = e.sections[s];
        const sectionResult = await client.query(
          'INSERT INTO exam_sections (exam_id, title, order_index) VALUES ($1,$2,$3) RETURNING id',
          [exam.id, section.title, s]
        );
        const sectionId = sectionResult.rows[0].id;

        for (let i = 0; i < (section.questionIds || []).length; i += 1) {
          const questionId = section.questionIds[i];
          await client.query(
            'INSERT INTO exam_questions (exam_id, section_id, question_id, order_index) VALUES ($1,$2,$3,$4)',
            [exam.id, sectionId, questionId, i]
          );
          const marksResult = await client.query('SELECT marks FROM questions WHERE id = $1', [questionId]);
          totalMarks += Number(marksResult.rows[0]?.marks || 0);
        }
      }
    }

    if (Array.isArray(e.studentIds)) {
      for (const studentId of e.studentIds) {
        await client.query(
          'INSERT INTO exam_enrollments (exam_id, student_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
          [exam.id, studentId]
        );
      }
    }

    const passingMarks = e.passingMarks ?? Math.round(totalMarks * 0.4);
    await client.query('UPDATE exams SET total_marks = $1, passing_marks = $2 WHERE id = $3', [
      totalMarks,
      passingMarks,
      exam.id,
    ]);

    await client.query('COMMIT');
    res.status(201).json({ exam: { ...exam, total_marks: totalMarks, passing_marks: passingMarks } });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

const listExams = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const params = [];
  let where = '';

  if (req.user.role === 'student') {
    params.push(req.user.id);
    where = `WHERE e.id IN (SELECT exam_id FROM exam_enrollments WHERE student_id = $1)`;
  } else if (req.user.role === 'examiner') {
    params.push(req.user.id);
    where = `WHERE e.created_by = $1`;
  }
  if (status) {
    params.push(status);
    where += (where ? ' AND ' : 'WHERE ') + `e.status = $${params.length}`;
  }

  const result = await db.query(
    `SELECT e.*,
       (SELECT COUNT(*) FROM exam_enrollments en WHERE en.exam_id = e.id)::int AS enrolled_count,
       (SELECT COUNT(*) FROM exam_attempts a WHERE a.exam_id = e.id AND a.status != 'in_progress')::int AS completed_count
     FROM exams e ${where} ORDER BY e.start_time DESC`,
    params
  );
  res.json({ exams: result.rows });
});

const getExam = asyncHandler(async (req, res) => {
  const examResult = await db.query('SELECT * FROM exams WHERE id = $1', [req.params.id]);
  if (!examResult.rows.length) throw new ApiError(404, 'Exam not found.');

  const sectionsResult = await db.query(
    'SELECT * FROM exam_sections WHERE exam_id = $1 ORDER BY order_index',
    [req.params.id]
  );
  const questionsResult = await db.query(
    `SELECT eq.section_id, eq.order_index, q.*
     FROM exam_questions eq JOIN questions q ON q.id = eq.question_id
     WHERE eq.exam_id = $1 ORDER BY eq.order_index`,
    [req.params.id]
  );

  res.json({
    exam: examResult.rows[0],
    sections: sectionsResult.rows,
    questions: questionsResult.rows,
  });
});

const updateExam = asyncHandler(async (req, res) => {
  const e = req.body;
  const result = await db.query(
    `UPDATE exams SET
       title = COALESCE($1, title),
       description = COALESCE($2, description),
       duration_minutes = COALESCE($3, duration_minutes),
       start_time = COALESCE($4, start_time),
       end_time = COALESCE($5, end_time),
       status = COALESCE($6, status),
       instructions = COALESCE($7, instructions),
       updated_at = NOW()
     WHERE id = $8 RETURNING *`,
    [e.title, e.description, e.durationMinutes, e.startTime, e.endTime, e.status, e.instructions, req.params.id]
  );
  if (!result.rows.length) throw new ApiError(404, 'Exam not found.');
  res.json({ exam: result.rows[0] });
});

const deleteExam = asyncHandler(async (req, res) => {
  const result = await db.query('DELETE FROM exams WHERE id = $1 RETURNING id', [req.params.id]);
  if (!result.rows.length) throw new ApiError(404, 'Exam not found.');
  res.json({ message: 'Exam deleted.' });
});

const enrollStudents = asyncHandler(async (req, res) => {
  const { studentIds } = req.body;
  if (!Array.isArray(studentIds) || !studentIds.length) {
    throw new ApiError(400, 'studentIds must be a non-empty array.');
  }
  for (const studentId of studentIds) {
    await db.query(
      'INSERT INTO exam_enrollments (exam_id, student_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
      [req.params.id, studentId]
    );
  }
  res.json({ message: `${studentIds.length} student(s) enrolled.` });
});
const joinExamByCode = asyncHandler(async (req, res) => {
  const { examCode } = req.body;

  if (!examCode) {
    throw new ApiError(400, "Exam code is required.");
  }

  const exam = await db.query(
    "SELECT id FROM exams WHERE exam_code = $1",
    [examCode.toUpperCase()]
  );

  if (!exam.rows.length) {
    throw new ApiError(404, "Invalid exam code.");
  }

  await db.query(
    `INSERT INTO exam_enrollments (exam_id, student_id)
     VALUES ($1,$2)
     ON CONFLICT DO NOTHING`,
    [exam.rows[0].id, req.user.id]
  );

  res.json({
    message: "Successfully joined exam.",
    examId: exam.rows[0].id
  });
});
module.exports = {
  createExam,
  listExams,
  getExam,
  updateExam,
  deleteExam,
  enrollStudents,
  joinExamByCode
};
