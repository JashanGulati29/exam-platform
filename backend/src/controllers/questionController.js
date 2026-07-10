const db = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { ApiError } = require('../middleware/errorHandler');

const listQuestions = asyncHandler(async (req, res) => {
  const { type, difficulty, categoryId, search, page = 1, pageSize = 20 } = req.query;
  const conditions = [];
  const params = [];

  if (type) { params.push(type); conditions.push(`type = $${params.length}`); }
  if (difficulty) { params.push(difficulty); conditions.push(`difficulty = $${params.length}`); }
  if (categoryId) { params.push(categoryId); conditions.push(`category_id = $${params.length}`); }
  if (search) { params.push(`%${search}%`); conditions.push(`statement ILIKE $${params.length}`); }

  // Examiners only see their own questions; admins see everything.
  if (req.user.role === 'examiner') {
    params.push(req.user.id);
    conditions.push(`created_by = $${params.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = Math.min(Number(pageSize) || 20, 100);
  const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;

  const result = await db.query(
    `SELECT q.*, c.name AS category_name FROM questions q
     LEFT JOIN categories c ON c.id = q.category_id
     ${whereClause}
     ORDER BY q.created_at DESC LIMIT ${limit} OFFSET ${offset}`,
    params
  );
  const countResult = await db.query(`SELECT COUNT(*)::int AS total FROM questions q ${whereClause}`, params);

  res.json({ questions: result.rows, total: countResult.rows[0].total, page: Number(page), pageSize: limit });
});

const getQuestion = asyncHandler(async (req, res) => {
  const result = await db.query('SELECT * FROM questions WHERE id = $1', [req.params.id]);
  if (!result.rows.length) throw new ApiError(404, 'Question not found.');
  res.json({ question: result.rows[0] });
});

const createQuestion = asyncHandler(async (req, res) => {
  const q = req.body;
  if (!q.type || !q.statement || q.correctAnswer === undefined) {
    throw new ApiError(400, 'type, statement and correctAnswer are required.');
  }
  const result = await db.query(
    `INSERT INTO questions
       (created_by, category_id, type, difficulty, statement, options, correct_answer,
        marks, negative_marks, starter_code, test_cases, tags)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [
      req.user.id,
      q.categoryId || null,
      q.type,
      q.difficulty || 'medium',
      q.statement,
      q.options ? JSON.stringify(q.options) : null,
      JSON.stringify(q.correctAnswer),
      q.marks ?? 1,
      q.negativeMarks ?? 0,
      q.starterCode || null,
      q.testCases ? JSON.stringify(q.testCases) : null,
      q.tags || [],
    ]
  );
  res.status(201).json({ question: result.rows[0] });
});

const updateQuestion = asyncHandler(async (req, res) => {
  const q = req.body;
  const result = await db.query(
    `UPDATE questions SET
       category_id = COALESCE($1, category_id),
       difficulty = COALESCE($2, difficulty),
       statement = COALESCE($3, statement),
       options = COALESCE($4, options),
       correct_answer = COALESCE($5, correct_answer),
       marks = COALESCE($6, marks),
       negative_marks = COALESCE($7, negative_marks),
       starter_code = COALESCE($8, starter_code),
       test_cases = COALESCE($9, test_cases),
       tags = COALESCE($10, tags),
       updated_at = NOW()
     WHERE id = $11 RETURNING *`,
    [
      q.categoryId,
      q.difficulty,
      q.statement,
      q.options ? JSON.stringify(q.options) : null,
      q.correctAnswer !== undefined ? JSON.stringify(q.correctAnswer) : null,
      q.marks,
      q.negativeMarks,
      q.starterCode,
      q.testCases ? JSON.stringify(q.testCases) : null,
      q.tags,
      req.params.id,
    ]
  );
  if (!result.rows.length) throw new ApiError(404, 'Question not found.');
  res.json({ question: result.rows[0] });
});

const deleteQuestion = asyncHandler(async (req, res) => {
  const result = await db.query('DELETE FROM questions WHERE id = $1 RETURNING id', [req.params.id]);
  if (!result.rows.length) throw new ApiError(404, 'Question not found.');
  res.json({ message: 'Question deleted.' });
});

// Bulk import accepts an array of question objects (e.g. parsed client-side
// from an uploaded CSV/XLSX file) and inserts them in a single transaction.
const bulkImport = asyncHandler(async (req, res) => {
  const { questions } = req.body;
  if (!Array.isArray(questions) || !questions.length) {
    throw new ApiError(400, 'questions must be a non-empty array.');
  }

  const client = await db.getClient();
  let inserted = 0;
  try {
    await client.query('BEGIN');
    for (const q of questions) {
      if (!q.type || !q.statement || q.correctAnswer === undefined) continue;
      await client.query(
        `INSERT INTO questions
           (created_by, category_id, type, difficulty, statement, options, correct_answer, marks, negative_marks, tags)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          req.user.id,
          q.categoryId || null,
          q.type,
          q.difficulty || 'medium',
          q.statement,
          q.options ? JSON.stringify(q.options) : null,
          JSON.stringify(q.correctAnswer),
          q.marks ?? 1,
          q.negativeMarks ?? 0,
          q.tags || [],
        ]
      );
      inserted += 1;
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  res.status(201).json({ message: `${inserted} of ${questions.length} questions imported.` });
});

const listCategories = asyncHandler(async (req, res) => {
  const result = await db.query('SELECT * FROM categories ORDER BY name');
  res.json({ categories: result.rows });
});

const createCategory = asyncHandler(async (req, res) => {
  const { name, subject } = req.body;
  if (!name) throw new ApiError(400, 'name is required.');
  const result = await db.query(
    'INSERT INTO categories (name, subject) VALUES ($1,$2) ON CONFLICT (name) DO UPDATE SET subject = EXCLUDED.subject RETURNING *',
    [name, subject || null]
  );
  res.status(201).json({ category: result.rows[0] });
});

module.exports = {
  listQuestions,
  getQuestion,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  bulkImport,
  listCategories,
  createCategory,
};
