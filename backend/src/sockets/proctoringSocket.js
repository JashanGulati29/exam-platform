const { verifyAccessToken } = require('../utils/jwt');

// Two kinds of clients connect to this namespace:
//  - students taking an exam (join exam:<id>:room, just to allow future
//    student-facing real-time features like "exam ending soon" pushes)
//  - admins/examiners watching the live proctor dashboard for an exam
//    (join exam:<id>:proctors, and receive `proctoring:event` broadcasts
//    emitted from proctoringController.logEvent)
function attachProctoringSocket(io) {
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required.'));
      socket.user = verifyAccessToken(token);
      next();
    } catch {
      next(new Error('Invalid or expired token.'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('join:exam-room', ({ examId }) => {
      socket.join(`exam:${examId}:room`);
    });

    socket.on('join:proctor-dashboard', ({ examId }) => {
      if (!['admin', 'examiner'].includes(socket.user.role)) return;
      socket.join(`exam:${examId}:proctors`);
    });

    socket.on('disconnect', () => {
      // No-op for now; presence/heartbeat is handled via the REST
      // heartbeat endpoint so it survives socket reconnects too.
    });
  });
}

module.exports = { attachProctoringSocket };
