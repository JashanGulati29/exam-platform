/**
 * Export controller — generates downloadable reports.
 *
 * CSV export is fully implemented here (no extra dependencies needed).
 * PDF export is a stub that returns a clear 501 pointing to the suggested
 * library; slot in `pdfkit` or `puppeteer` when you're ready.
 */
const db = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

function escapeCSV(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function rowsToCSV(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.map(escapeCSV).join(','),
    ...rows.map((r) => headers.map((h) => escapeCSV(r[h])).join(',')),
  ];
  return lines.join('\r\n');
}

/** GET /api/export/exams/:examId/results.csv */
const exportExamResultsCSV = asyncHandler(async (req, res) => {
  const { examId } = req.params;
  const { rows } = await db.query(
    `SELECT u.full_name AS student_name, u.email,
            r.total_score, r.max_score,
            ROUND(100.0 * r.total_score / NULLIF(r.max_score, 0), 1) AS percentage,
            r.is_pass, r.rank, r.accuracy,
            ea.status AS attempt_status, ea.submitted_at,
            ea.tab_switch_count
     FROM results r
     JOIN users u ON u.id = r.student_id
     JOIN exam_attempts ea ON ea.id = r.attempt_id
     WHERE r.exam_id = $1
     ORDER BY r.rank ASC NULLS LAST`,
    [examId]
  );

  const examRow = await db.query('SELECT title FROM exams WHERE id = $1', [examId]);
  const examTitle = examRow.rows[0]?.title?.replace(/[^a-z0-9]/gi, '_') || 'exam';

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${examTitle}_results.csv"`);
  res.send(rowsToCSV(rows));
});

/** GET /api/export/exams/:examId/proctoring.csv */
const exportProctoringCSV = asyncHandler(async (req, res) => {
  const { examId } = req.params;
  const { rows } = await db.query(
    `SELECT u.full_name AS student_name, u.email,
            pl.event_type, pl.severity, pl.occurred_at, pl.metadata
     FROM proctoring_logs pl
     JOIN exam_attempts ea ON ea.id = pl.attempt_id
     JOIN users u ON u.id = ea.student_id
     WHERE ea.exam_id = $1
     ORDER BY pl.occurred_at ASC`,
    [examId]
  );

  const examRow = await db.query('SELECT title FROM exams WHERE id = $1', [examId]);
  const examTitle = examRow.rows[0]?.title?.replace(/[^a-z0-9]/gi, '_') || 'exam';

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${examTitle}_proctoring.csv"`);
  res.send(rowsToCSV(rows));
});

/**
 * PDF export stub.
 * To implement: npm install pdfkit (backend) or use puppeteer to render the
 * existing React results page to PDF. Returns 501 until wired up.
 */
const exportExamResultsPDF = asyncHandler(async (req, res) => {
  res.status(501).json({
    message:
      'PDF export is not yet implemented. Install `pdfkit` and use the CSV rows from ' +
      '`exportExamResultsCSV` to build the document, or use puppeteer to render the ' +
      '/exams/:examId/results page to PDF.',
  });
});

module.exports = { exportExamResultsCSV, exportProctoringCSV, exportExamResultsPDF };
