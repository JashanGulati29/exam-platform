const nodemailer = require('nodemailer');

// In development (no SMTP credentials configured) emails are logged to the
// console instead of actually being sent, so the app is fully usable
// without an email provider set up.
const isConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);

const transporter = isConfigured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

async function sendEmail({ to, subject, text }) {
  if (!isConfigured) {
    console.log(`[mailer:dev-mode] To: ${to} | Subject: ${subject}\n${text}`);
    return { devMode: true };
  }
  return transporter.sendMail({
    from: process.env.SMTP_FROM || 'no-reply@examplatform.com',
    to,
    subject,
    text,
  });
}

module.exports = { sendEmail };
