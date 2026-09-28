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

// Email a customer (confirmations). Needs the Gmail transport — Netlify Forms can only reach the owners.
export async function emailCustomer({ to, subject, text }) {
  const user = process.env.GMAIL_USER, pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass || !to) return { skipped: true, reason: !to ? 'no address' : 'gmail not configured' };
  const transport = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } });
  await transport.sendMail({ from: `"Pour Decisions" <${user}>`, replyTo: user, to, subject, text });
  return { sent: 1, via: 'gmail' };
}

// Text messages through Twilio. Off until TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN and a sender
// (TWILIO_MESSAGING_SERVICE_SID, or TWILIO_FROM) are set. OWNER_PHONES = comma-separated owner cells.
export const smsReady = () => !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && (process.env.TWILIO_MESSAGING_SERVICE_SID || process.env.TWILIO_FROM));
const e164 = (p) => { const d = String(p || '').replace(/\D/g, ''); return d.length === 10 ? '+1' + d : d.length === 11 && d[0] === '1' ? '+' + d : ''; };
export async function sendSms(to, body) {
  const num = e164(to);
  if (!smsReady() || !num) return { skipped: true, reason: !num ? 'bad number' : 'twilio not configured' };
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const form = new URLSearchParams({ To: num, Body: String(body).slice(0, 600) });
  if (process.env.TWILIO_MESSAGING_SERVICE_SID) form.set('MessagingServiceSid', process.env.TWILIO_MESSAGING_SERVICE_SID);
  else form.set('From', process.env.TWILIO_FROM);
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST', body: form,
    headers: { authorization: 'Basic ' + Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64'), 'content-type': 'application/x-www-form-urlencoded' },
  });
  const j = await r.json().catch(() => ({}));
  return r.ok ? { sent: 1, via: 'twilio', sid: j.sid } : { sent: 0, via: 'twilio', status: r.status, error: j.message || '' };
}
export async function textOwners(body) {
  const to = String(process.env.OWNER_PHONES || '').split(/[,\s]+/).filter(Boolean);
  if (!to.length) return { skipped: true, reason: 'OWNER_PHONES not set' };
  return Promise.all(to.map((n) => sendSms(n, body)));
}
