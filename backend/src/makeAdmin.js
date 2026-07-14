const db = require('./config/db');

async function makeAdmin() {
  try {
    await db.query(
      "UPDATE users SET role='admin' WHERE email='jashangulati17@gmail.com'"
    );
    console.log("Admin updated successfully");
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

makeAdmin();