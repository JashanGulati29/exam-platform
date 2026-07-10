const router = require('express').Router();
const exp = require('../controllers/exportController');
const { requireRole } = require('../middleware/auth');
const { verifyAccessToken } = require('../utils/jwt');

// File downloads can't set Authorization headers from an <a> tag, so we
// accept the token as a query parameter for export routes only.
function requireAuthQuery(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token;
  if (!token) return res.status(401).json({ message: 'Authentication token missing.' });
  try {
    req.user = (() => {
      const p = verifyAccessToken(token);
      return { id: p.sub, role: p.role, email: p.email };
    })();
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

router.use(requireAuthQuery, requireRole('admin', 'examiner'));

router.get('/exams/:examId/results.csv',    exp.exportExamResultsCSV);
router.get('/exams/:examId/proctoring.csv', exp.exportProctoringCSV);
router.get('/exams/:examId/results.pdf',    exp.exportExamResultsPDF);

module.exports = router;
