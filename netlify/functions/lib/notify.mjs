// Owner notifications — two transports, no config required for the first:
//  1. Netlify Forms (default): the function submits a hidden form ("owner-alert") on the site itself.
//     Netlify emails every submission to the addresses set under Project configuration → Notifications.
//     Free tier: 100 submissions/month. Zero credentials.
//  2. Gmail (optional, unlimited): if GMAIL_USER + GMAIL_APP_PASSWORD are set in Netlify env vars,
//     mail goes out through the shop Gmail instead (NOTIFY_TO = recipients).
import nodemailer from 'nodemailer';

export async function notifyOwners({ subject, text, origin }) {
  const user = process.env.GMAIL_USER, pass = process.env.GMAIL_APP_PASSWORD;
  const to = String(process.env.NOTIFY_TO || user || '').split(/[,\s]+/).filter(Boolean);
  if (user && pass && to.length) {
    const transport = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } });
    await transport.sendMail({ from: `"Pour Decisions" <${user}>`, to: to.join(', '), subject: '[Pour Decisions] ' + subject, text });
    return { sent: to.length, via: 'gmail' };
  }
  const base = origin || process.env.URL || '';
  if (!base) return { skipped: true, reason: 'no origin' };
  const body = new URLSearchParams({ 'form-name': 'owner-alert', subject: '[Pour Decisions] ' + subject, message: text });
  const r = await fetch(base + '/', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body });
  return { sent: r.ok ? 1 : 0, via: 'netlify-forms', status: r.status };
}
