const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const questionRoutes = require('./routes/questionRoutes');
const examRoutes = require('./routes/examRoutes');
const attemptRoutes = require('./routes/attemptRoutes');
const proctoringRoutes = require('./routes/proctoringRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const resultRoutes = require('./routes/resultRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const auditRoutes = require('./routes/auditRoutes');
const exportRoutes = require('./routes/exportRoutes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();
app.set('trust proxy', 1);
app.use(helmet());
const allowedOrigins = [
  "http://localhost:5173",
  "https://exam-platform-new.vercel.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Generic API rate limit; the auth routes get a stricter one below to slow
// down credential-stuffing / brute-force attempts.
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));
app.use(
  '/api/auth/login',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { message: 'Too many login attempts, try again later.' } })
);

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/attempts', attemptRoutes);
app.use('/api/proctoring', proctoringRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/export', exportRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
