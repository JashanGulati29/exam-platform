// Seeds an initial admin account + a few question categories so the app
// is usable immediately after migration. Run with: npm run seed
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../config/db');

async function seed() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@examplatform.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin@123';

  const existing = await db.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
  if (!existing.rows.length) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await db.query(
      `INSERT INTO users (full_name, email, password_hash, role, is_email_verified)
       VALUES ($1,$2,$3,'admin', TRUE)`,
      ['Platform Admin', adminEmail, passwordHash]
    );
    console.log(`Created admin account: ${adminEmail} / ${adminPassword}`);
  } else {
    console.log('Admin account already exists, skipping.');
  }

  const categories = [
    { name: 'Mathematics', subject: 'Mathematics' },
    { name: 'Data Structures', subject: 'Computer Science' },
    { name: 'General Aptitude', subject: 'Aptitude' },
  ];
  for (const c of categories) {
    await db.query(
      'INSERT INTO categories (name, subject) VALUES ($1,$2) ON CONFLICT (name) DO NOTHING',
      [c.name, c.subject]
    );
  }
  console.log('Seeded categories.');

  await db.pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
