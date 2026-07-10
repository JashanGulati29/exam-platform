const bcrypt = require('bcryptjs');
const db = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { ApiError } = require('../middleware/errorHandler');

const PUBLIC_FIELDS = 'id, full_name, email, role, is_active, is_email_verified, created_at';

// List users, optionally filtered by role and a free-text search on name/email.
const listUsers = asyncHandler(async (req, res) => {
  const { role, search, page = 1, pageSize = 20 } = req.query;
  const conditions = [];
  const params = [];

  if (role) {
    params.push(role);
    conditions.push(`role = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(full_name ILIKE $${params.length} OR email ILIKE $${params.length})`);
  }
  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = Math.min(Number(pageSize) || 20, 100);
  const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;

  const result = await db.query(
    `SELECT ${PUBLIC_FIELDS} FROM users ${whereClause}
     ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
    params
  );
  const countResult = await db.query(`SELECT COUNT(*)::int AS total FROM users ${whereClause}`, params);

  res.json({ users: result.rows, total: countResult.rows[0].total, page: Number(page), pageSize: limit });
});

// Admin-created accounts (examiners, or additional admins) skip email verification.
const createUser = asyncHandler(async (req, res) => {
  const { fullName, email, password, role } = req.body;
  if (!fullName || !email || !password || !role) {
    throw new ApiError(400, 'fullName, email, password and role are required.');
  }
  const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length) throw new ApiError(409, 'A user with this email already exists.');

  const passwordHash = await bcrypt.hash(password, 10);
  const result = await db.query(
    `INSERT INTO users (full_name, email, password_hash, role, is_email_verified)
     VALUES ($1, $2, $3, $4, TRUE) RETURNING ${PUBLIC_FIELDS}`,
    [fullName, email, passwordHash, role]
  );
  res.status(201).json({ user: result.rows[0] });
});

const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { fullName, role, isActive } = req.body;

  const result = await db.query(
    `UPDATE users SET
       full_name = COALESCE($1, full_name),
       role = COALESCE($2, role),
       is_active = COALESCE($3, is_active),
       updated_at = NOW()
     WHERE id = $4 RETURNING ${PUBLIC_FIELDS}`,
    [fullName, role, isActive, id]
  );
  if (!result.rows.length) throw new ApiError(404, 'User not found.');
  res.json({ user: result.rows[0] });
});

const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await db.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
  if (!result.rows.length) throw new ApiError(404, 'User not found.');
  res.json({ message: 'User deleted.' });
});

module.exports = { listUsers, createUser, updateUser, deleteUser };
