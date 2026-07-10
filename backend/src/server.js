require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const db = require('./config/db');
const { attachProctoringSocket } = require('./sockets/proctoringSocket');
const { autoSubmitAttempt } = require('./controllers/attemptController');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CORS_ORIGIN || 'http://localhost:5173', credentials: true },
});
attachProctoringSocket(io);
app.set('io', io);

// Auto-submits any attempt whose exam end_time has passed while it was
// still in_progress, so students can never "run out the clock" past the
// scheduled window even if their browser tab stayed open.
async function autoSubmitExpiredAttempts() {
  try {
    const { rows } = await db.query(
      `SELECT a.id FROM exam_attempts a JOIN exams e ON e.id = a.exam_id
       WHERE a.status = 'in_progress' AND e.end_time < NOW()`
    );
    if (!rows.length) return;

    for (const row of rows) {
      await autoSubmitAttempt(row.id);
    }
    console.log(`Auto-submitted ${rows.length} expired attempt(s).`);
  } catch (err) {
    console.error('Auto-submit job failed:', err.message);
  }
}

setInterval(autoSubmitExpiredAttempts, 60 * 1000);

server.listen(PORT, () => {
  console.log(`Exam platform API listening on port ${PORT}`);
});
