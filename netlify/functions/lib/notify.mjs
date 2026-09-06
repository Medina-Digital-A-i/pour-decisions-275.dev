// Owner notifications. Sends through the shop Gmail with an App Password — no extra service.
// Netlify env vars: GMAIL_USER (the sending Gmail), GMAIL_APP_PASSWORD (16-char app password),
// NOTIFY_TO (comma-separated recipients — Migs + Kendu). If any is missing, notifications are skipped silently.
import nodemailer from 'nodemailer';

export async function notifyOwners({ subject, text, html }) {
  const user = process.env.GMAIL_USER, pass = process.env.GMAIL_APP_PASSWORD;
  const to = String(process.env.NOTIFY_TO || user || '').split(/[,\s]+/).filter(Boolean);
  if (!user || !pass || !to.length) return { skipped: true };
  const transport = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } });
  await transport.sendMail({ from: `"Pour Decisions" <${user}>`, to: to.join(', '), subject: '[Pour Decisions] ' + subject, text, html });
  return { sent: to.length };
}
