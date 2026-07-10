// Pure grading functions. Kept separate from controllers so they're easy
// to unit test and reuse (e.g. from a re-evaluation script).

/**
 * Grades a single answer against its question definition.
 * Returns { isCorrect, marksAwarded, requiresManualReview }
 */
function gradeAnswer(question, response) {
  switch (question.type) {
    case 'mcq':
      return gradeMcq(question, response);
    case 'true_false':
      return gradeTrueFalse(question, response);
    case 'coding':
      return gradeCoding(question, response);
    case 'short_answer':
    default:
      // Short answers always go to an examiner for manual marking.
      return { isCorrect: null, marksAwarded: null, requiresManualReview: true };
  }
}

function gradeMcq(question, response) {
  const correct = normalizeToArray(question.correct_answer);
  const given = normalizeToArray(response);
  const isCorrect =
    correct.length === given.length &&
    correct.every((c) => given.includes(c));

  if (isCorrect) {
    return { isCorrect: true, marksAwarded: Number(question.marks), requiresManualReview: false };
  }
  // No answer given -> 0 marks, no penalty. Wrong answer -> apply negative marking if configured.
  const isBlank = given.length === 0;
  const penalty = isBlank ? 0 : Number(question.negative_marks || 0);
  return { isCorrect: false, marksAwarded: -penalty, requiresManualReview: false };
}

function gradeTrueFalse(question, response) {
  const correct = String(question.correct_answer).toLowerCase();
  const given = response === null || response === undefined ? null : String(response).toLowerCase();
  if (given === null) {
    return { isCorrect: false, marksAwarded: 0, requiresManualReview: false };
  }
  const isCorrect = given === correct;
  const marksAwarded = isCorrect
    ? Number(question.marks)
    : -Number(question.negative_marks || 0);
  return { isCorrect, marksAwarded, requiresManualReview: false };
}

function gradeCoding(question, response) {
  // `response` is expected to be { testResults: [{ passed: bool }, ...] }
  // produced by the (separate, sandboxed) code-execution service.
  // This grader only aggregates results that were already computed there;
  // it deliberately does NOT execute untrusted code itself.
  const testResults = response && Array.isArray(response.testResults) ? response.testResults : null;
  if (!testResults) {
    return { isCorrect: null, marksAwarded: null, requiresManualReview: true };
  }
  const total = testResults.length || 1;
  const passed = testResults.filter((t) => t.passed).length;
  const ratio = passed / total;
  const marksAwarded = Number((ratio * Number(question.marks)).toFixed(2));
  return { isCorrect: ratio === 1, marksAwarded, requiresManualReview: false };
}

function normalizeToArray(value) {
  if (value === null || value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

module.exports = { gradeAnswer };
