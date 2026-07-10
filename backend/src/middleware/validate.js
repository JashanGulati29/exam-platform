const { ApiError } = require('./errorHandler');

/**
 * Minimal schema-based body validator (kept dependency-free).
 * Usage: validateBody({ email: { required: true, type: 'string' }, ... })
 *
 * For a larger production system, swap this for `zod` or `express-validator`,
 * the route/controller code does not need to change.
 */
function validateBody(schema) {
  return (req, res, next) => {
    const errors = [];
    for (const [field, rules] of Object.entries(schema)) {
      const value = req.body[field];
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} is required.`);
        continue;
      }
      if (value !== undefined && rules.type && typeof value !== rules.type) {
        errors.push(`${field} must be of type ${rules.type}.`);
      }
      if (value !== undefined && rules.enum && !rules.enum.includes(value)) {
        errors.push(`${field} must be one of: ${rules.enum.join(', ')}.`);
      }
    }
    if (errors.length) {
      return next(new ApiError(400, 'Validation failed.', errors));
    }
    next();
  };
}

module.exports = { validateBody };
