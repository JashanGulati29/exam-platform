const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Automatically create exam_code column if it doesn't exist
(async () => {
  try {
    await pool.query(`
      ALTER TABLE exams
      ADD COLUMN IF NOT EXISTS exam_code VARCHAR(10);
    `);

    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS exams_exam_code_key
      ON exams(exam_code);
    `);

    console.log("✅ exam_code column checked/created.");
  } catch (err) {
    console.error("❌ Error creating exam_code column:", err.message);
  }
})();

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL pool error", err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
  pool,
};