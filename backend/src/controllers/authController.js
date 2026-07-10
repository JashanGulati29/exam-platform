const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { ApiError } = require('../middleware/errorHandler');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { sendEmail } = require('../utils/mailer');

const PUBLIC_USER_FIELDS = 'id, full_name, email, role, is_email_verified, avatar_url, created_at';

const signup = asyncHandler(async (req, res) => {
  const { fullName, email, password, role } = req.body;
  if (!fullName || !email || !password) {
    throw new ApiError(400, 'fullName, email and password are required.');
  }
  // Only admins are allowed to create examiner/admin accounts directly;
  // public signup always creates a student account.
  const finalRole = role === 'student' || !role ? 'student' : 'student';

  const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length) {
    throw new ApiError(409, 'An account with this email already exists.');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const verifyToken = crypto.randomBytes(32).toString('hex');

  const result = await db.query(
    `INSERT INTO users (full_name, email, password_hash, role, email_verify_token)
     VALUES ($1, $2, $3, $4, $5) RETURNING ${PUBLIC_USER_FIELDS}`,
    [fullName, email, passwordHash, finalRole, verifyToken]
  );

  await sendEmail({
    to: email,
    subject: 'Verify your email',
    text: `Welcome! Verify your account using this token: ${verifyToken}`,
  });

  res.status(201).json({
    message: 'Account created. Check your email to verify your account.',
    user: result.rows[0],
  });
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body;
  const result = await db.query(
    `UPDATE users SET is_email_verified = TRUE, email_verify_token = NULL
     WHERE email_verify_token = $1 RETURNING ${PUBLIC_USER_FIELDS}`,
    [token]
  );
  if (!result.rows.length) {
    throw new ApiError(400, 'Invalid or expired verification token.');
  }
  res.json({ message: 'Email verified successfully.', user: result.rows[0] });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new ApiError(400, 'email and password are required.');
  }

  const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = result.rows[0];
  if (!user || !user.is_active) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  res.json({
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      role: user.role,
      isEmailVerified: user.is_email_verified,
      avatarUrl: user.avatar_url,
    },
  });
});

const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw new ApiError(400, 'refreshToken is required.');

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new ApiError(401, 'Invalid or expired refresh token.');
  }

  const result = await db.query('SELECT * FROM users WHERE id = $1', [payload.sub]);
  const user = result.rows[0];
  if (!user) throw new ApiError(401, 'User no longer exists.');

  res.json({ accessToken: signAccessToken(user) });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const result = await db.query('SELECT id FROM users WHERE email = $1', [email]);

  // Always respond the same way, regardless of whether the email exists,
  // to avoid leaking which addresses are registered.
  if (result.rows.length) {
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await db.query(
      'UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE email = $3',
      [resetToken, expires, email]
    );
    await sendEmail({
      to: email,
      subject: 'Reset your password',
      text: `Use this token to reset your password: ${resetToken} (expires in 1 hour)`,
    });
  }

  res.json({ message: 'If that email is registered, a reset link has been sent.' });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) throw new ApiError(400, 'token and newPassword are required.');

  const result = await db.query(
    'SELECT id FROM users WHERE reset_password_token = $1 AND reset_password_expires > NOW()',
    [token]
  );
  if (!result.rows.length) {
    throw new ApiError(400, 'Invalid or expired reset token.');
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.query(
    `UPDATE users SET password_hash = $1, reset_password_token = NULL, reset_password_expires = NULL
     WHERE id = $2`,
    [passwordHash, result.rows[0].id]
  );

  res.json({ message: 'Password reset successfully. You can now log in.' });
});

const me = asyncHandler(async (req, res) => {
  const result = await db.query(`SELECT ${PUBLIC_USER_FIELDS} FROM users WHERE id = $1`, [req.user.id]);
  if (!result.rows.length) throw new ApiError(404, 'User not found.');
  res.json({ user: result.rows[0] });
});

// Authenticated users can change their own password by providing the current one.
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    throw new ApiError(400, 'currentPassword and newPassword are required.');
  }
  if (newPassword.length < 8) throw new ApiError(400, 'New password must be at least 8 characters.');

  const result = await db.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
  const user = result.rows[0];
  if (!user) throw new ApiError(404, 'User not found.');

  const matches = await bcrypt.compare(currentPassword, user.password_hash);
  if (!matches) throw new ApiError(401, 'Current password is incorrect.');

  const newHash = await bcrypt.hash(newPassword, 10);
  await db.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, req.user.id]);

  res.json({ message: 'Password changed successfully.' });
});

module.exports = { signup, verifyEmail, login, refresh, forgotPassword, resetPassword, me, changePassword };
