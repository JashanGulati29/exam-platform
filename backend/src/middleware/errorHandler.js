// Centralized error handler. Controllers/middleware can throw an Error with
// a `.statusCode` and `.details` to control the response shape; anything
// else falls back to a generic 500 so internals are never leaked.
function notFoundHandler(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 ? 'Something went wrong on our end.' : err.message;

  if (statusCode === 500) {
    console.error(err);
  }

  res.status(statusCode).json({
    message,
    details: err.details || undefined,
  });
}

class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

module.exports = { notFoundHandler, errorHandler, ApiError };
